import { prisma } from "@/lib/db";
import { haversineKm, nearestStop } from "@/lib/geo";
import { nid } from "@/lib/ids";
import { weekdaySun0 } from "@/lib/time";
import { DETOUR_CAP_MIN, rankDriver } from "./matching";
import { audit } from "./records";
import { driverDocsValid } from "./records";
import { createRun, seatsFree } from "./runs";
import { drive } from "./routing";

type Demand = {
  customerId: string;
  routeId: string;
  pickupStopId: string;
  dropStopId: string;
  womenOnly: boolean;
  wheelchair: boolean;
  walkRadiusM: number;
};

export async function buildPlan(serviceDate: string, shift: "morning" | "evening") {
  const day = weekdaySun0(serviceDate);
  if (day === 5 || day === 6) {
    return { skipped: true as const, reason: "weekend" };
  }

  const subscriptions = await prisma.commuteSubscription.findMany({
    where: { status: "active" },
    include: { customer: { include: { preference: true } } },
  });
  const loose = await prisma.booking.findMany({
    where: { serviceDate, shift, runId: null, status: "confirmed" },
    include: { customer: { include: { preference: true } } },
  });

  const demands: Demand[] = [];
  const unclustered: { customerId: string; reason: string }[] = [];

  for (const sub of subscriptions) {
    const days = sub.days.split(",").map((d) => Number(d.trim()));
    if (!days.includes(day)) continue;
    const existing = await prisma.booking.findFirst({
      where: {
        customerId: sub.customerId,
        serviceDate,
        shift,
        routeId: sub.routeId,
        status: { notIn: ["cancelled"] },
      },
    });
    if (existing) continue;
    const pref = sub.customer.preference;
    demands.push({
      customerId: sub.customerId,
      routeId: sub.routeId,
      pickupStopId: sub.pickupStopId,
      dropStopId: sub.dropStopId,
      womenOnly: sub.womenOnly || Boolean(pref?.womenOnly),
      wheelchair: pref?.accessibility === "wheelchair",
      walkRadiusM: pref?.walkRadiusM ?? 600,
    });
  }

  for (const booking of loose) {
    const pref = booking.customer.preference;
    demands.push({
      customerId: booking.customerId,
      routeId: booking.routeId,
      pickupStopId: booking.pickupStopId,
      dropStopId: booking.dropStopId,
      womenOnly: booking.womenOnly || Boolean(pref?.womenOnly),
      wheelchair: pref?.accessibility === "wheelchair",
      walkRadiusM: pref?.walkRadiusM ?? 600,
    });
  }

  const snapped: Demand[] = [];
  for (const demand of demands) {
    const stop = await prisma.stop.findUnique({ where: { id: demand.pickupStopId } });
    if (!stop) {
      unclustered.push({ customerId: demand.customerId, reason: "Pickup stop is missing." });
      continue;
    }
    const stops = await prisma.stop.findMany({ where: { routeId: demand.routeId } });
    const near = nearestStop({ lat: stop.lat, lng: stop.lng }, stops, Math.max(demand.walkRadiusM, 800));
    if (!near) {
      unclustered.push({ customerId: demand.customerId, reason: "Pickup is outside the walk catchment." });
      continue;
    }
    snapped.push(demand);
  }

  const groups = new Map<string, Demand[]>();
  for (const demand of snapped) {
    const key = `${demand.routeId}|${demand.womenOnly ? "w" : "m"}|${demand.wheelchair ? "c" : "a"}`;
    const list = groups.get(key) ?? [];
    list.push(demand);
    groups.set(key, list);
  }

  const proposed = await prisma.cluster.findMany({
    where: { serviceDate, shift, status: "proposed" },
    select: { id: true },
  });
  const proposedIds = proposed.map((c) => c.id);
  if (proposedIds.length) {
    await prisma.recommendation.deleteMany({ where: { clusterId: { in: proposedIds } } });
    await prisma.cluster.deleteMany({ where: { id: { in: proposedIds } } });
  }

  const drivers = await prisma.driver.findMany({ include: { operator: true, vehicles: true } });
  const created: string[] = [];
  const heldOnRoute = new Map<string, string>();

  for (const [, group] of groups) {
    const first = group[0];
    const stopIds = Array.from(new Set(group.flatMap((g) => [g.pickupStopId, g.dropStopId])));
    const cluster = await prisma.cluster.create({
      data: {
        id: nid("clu"),
        serviceDate,
        shift,
        routeId: first.routeId,
        customerIds: JSON.stringify(group.map((g) => g.customerId)),
        stopIds: JSON.stringify(stopIds),
        requiredSeats: group.length,
        womenOnly: first.womenOnly,
        wheelchair: first.wheelchair,
        status: "proposed",
      },
    });
    created.push(cluster.id);

    const firstStop = await prisma.stop.findUnique({ where: { id: first.pickupStopId } });
    const route = await prisma.route.findUnique({ where: { id: first.routeId } });
    const routeStops = await prisma.stop.findMany({ where: { routeId: first.routeId }, orderBy: { sequence: "asc" } });
    const clusterStops = routeStops.filter((stop) => stopIds.includes(stop.id));
    const corridorMinutes = (await drive(routeStops)).durationMin;
    const ranked = [];
    for (const driver of drivers) {
      const vehicle = driver.vehicles.find((v) => v.id === driver.defaultVehicleId) ?? driver.vehicles[0];
      const preferred = driver.preferredRouteIds.split(",").map((item) => item.trim()).filter(Boolean);
      const routeKeys = [first.routeId, route?.slug, route?.slug ? `rte_${route.slug}` : ""].filter(Boolean);
      const sameRoute = preferred.length === 0 || preferred.some((item) => routeKeys.includes(item));
      let detourMin = 0;
      if (!sameRoute && firstStop) {
        const origin = driver.liveLat != null && driver.liveLng != null
          ? { lat: driver.liveLat, lng: driver.liveLng }
          : driver.baseLat != null && driver.baseLng != null
            ? { lat: driver.baseLat, lng: driver.baseLng }
            : null;
        detourMin = origin ? (await drive([origin, firstStop])).durationMin : 30;
      } else if (clusterStops.length >= 2) {
        const servedMinutes = (await drive(clusterStops)).durationMin;
        detourMin = Math.max(0, servedMinutes - corridorMinutes);
      }
      const other = await prisma.run.findFirst({
        where: {
          driverId: driver.id,
          serviceDate,
          shift,
          status: { in: ["scheduled", "live"] },
          routeId: { not: first.routeId },
        },
      });
      const sameRun = await prisma.run.findFirst({
        where: {
          driverId: driver.id,
          serviceDate,
          shift,
          routeId: first.routeId,
          status: { in: ["scheduled", "live"] },
        },
        include: { vehicle: true },
      });
      let seats = vehicle?.seatCapacity ?? 0;
      if (sameRun) seats = await seatsFree(sameRun.id);
      const off = await prisma.timeOff.findFirst({ where: { driverId: driver.id, date: serviceDate } });
      const docsValid = vehicle ? await driverDocsValid(driver.id, vehicle.id) : false;
      const heldRoute = heldOnRoute.get(driver.id);
      const distanceKm =
        driver.baseLat != null && driver.baseLng != null && firstStop
          ? Math.round(haversineKm({ lat: driver.baseLat, lng: driver.baseLng }, firstStop) * 10) / 10
          : 25;
      const result = rankDriver({
        distanceKm,
        detourMin,
        detourCap: Math.min(DETOUR_CAP_MIN, driver.maxDetourMin || DETOUR_CAP_MIN),
        sameRoute,
        seatsFree: seats,
        seatsNeeded: group.length,
        capacity: vehicle?.seatCapacity ?? seats,
        scheduleFit: off ? 0 : 1,
        rating: driver.ratingAvg,
        vehicleMatch: !first.wheelchair || Boolean(vehicle?.wheelchair),
        hardVehicleFail: first.wheelchair && !vehicle?.wheelchair,
        womenRequired: first.womenOnly,
        womenEligible: driver.womenOnlyEligible && Boolean(vehicle?.ladiesLicensed),
        ladiesVehicle: Boolean(vehicle?.ladiesLicensed),
        approved: driver.status === "approved",
        docsValid,
        licensedOperator: driver.operator.active && Boolean(driver.operator.licenceRef),
        available: !off && driver.status === "approved",
        doubleBookedElsewhere: Boolean(other) || (heldRoute != null && heldRoute !== first.routeId),
      });
      ranked.push({ driver, vehicle, result });
    }

    ranked.sort((a, b) => {
      if (a.result.eligible !== b.result.eligible) return a.result.eligible ? -1 : 1;
      return b.result.score - a.result.score;
    });
    const top = ranked.find((row) => row.result.eligible);
    if (top && !heldOnRoute.has(top.driver.id)) heldOnRoute.set(top.driver.id, first.routeId);

    await prisma.recommendation.createMany({
      data: ranked.map((row, index) => ({
        id: nid("rec"),
        clusterId: cluster.id,
        driverId: row.driver.id,
        vehicleId: row.vehicle?.id ?? null,
        rank: index + 1,
        score: row.result.score,
        breakdown: JSON.stringify(row.result.breakdown),
        eligible: row.result.eligible,
        rejectReason: row.result.rejectReason,
      })),
    });
  }

  return { skipped: false as const, clusters: created.length, unclustered };
}

export async function confirmCluster(opts: {
  clusterId: string;
  driverId: string;
  staffId: string;
  staffName: string;
  reason?: string | null;
  source: "recommended" | "override";
}) {
  const cluster = await prisma.cluster.findUnique({ where: { id: opts.clusterId } });
  if (!cluster || cluster.status === "assigned") throw new Error("Cluster is not open.");
  const driver = await prisma.driver.findUnique({ where: { id: opts.driverId }, include: { vehicles: true, operator: true } });
  if (!driver) throw new Error("Driver missing.");
  const vehicle = driver.vehicles.find((v) => v.id === driver.defaultVehicleId) ?? driver.vehicles[0];
  if (!vehicle) throw new Error("Driver has no vehicle.");
  if (opts.source === "override" && !opts.reason?.trim()) throw new Error("Override needs a reason.");

  const conflict = await prisma.run.findFirst({
    where: {
      driverId: driver.id,
      serviceDate: cluster.serviceDate,
      shift: cluster.shift,
      status: { in: ["scheduled", "live"] },
      routeId: { not: cluster.routeId },
    },
  });
  if (conflict) throw new Error("Driver is already assigned on another corridor this shift.");

  const customerIds = JSON.parse(cluster.customerIds) as string[];
  let run = await prisma.run.findFirst({
    where: {
      driverId: driver.id,
      routeId: cluster.routeId,
      serviceDate: cluster.serviceDate,
      shift: cluster.shift,
      status: { in: ["scheduled", "live"] },
    },
  });

  const assignment = await prisma.assignment.create({
    data: {
      id: nid("asg"),
      clusterId: cluster.id,
      driverId: driver.id,
      vehicleId: vehicle.id,
      routeId: cluster.routeId,
      source: opts.source,
      reason: opts.reason ?? null,
      assignedById: opts.staffId,
      serviceDate: cluster.serviceDate,
      shift: cluster.shift,
      status: "confirmed",
      locked: false,
    },
  });

  if (!run) {
    run = await createRun({
      routeId: cluster.routeId,
      driverId: driver.id,
      vehicleId: vehicle.id,
      serviceDate: cluster.serviceDate,
      shift: cluster.shift,
      assignmentId: assignment.id,
    });
  }

  const subs = await prisma.commuteSubscription.findMany({
    where: { customerId: { in: customerIds }, routeId: cluster.routeId, status: "active" },
  });
  const subByCustomer = new Map(subs.map((s) => [s.customerId, s]));

  for (const customerId of customerIds) {
    const existing = await prisma.booking.findFirst({
      where: {
        customerId,
        serviceDate: cluster.serviceDate,
        shift: cluster.shift,
        routeId: cluster.routeId,
        status: { not: "cancelled" },
      },
    });
    const sub = subByCustomer.get(customerId);
    if (existing) {
      if (!existing.runId) {
        await prisma.booking.update({ where: { id: existing.id }, data: { runId: run.id, status: "confirmed" } });
      }
      continue;
    }
    if (!sub) continue;
    await prisma.booking.create({
      data: {
        id: nid("bkg"),
        customerId,
        runId: run.id,
        routeId: cluster.routeId,
        serviceDate: cluster.serviceDate,
        shift: cluster.shift,
        windowLabel: cluster.shift === "morning" ? sub.morningWindow : sub.eveningWindow,
        pickupStopId: sub.pickupStopId,
        dropStopId: sub.dropStopId,
        product: "monthly",
        priceAed: 0,
        status: "confirmed",
        pin: String(1000 + Math.floor(Math.random() * 9000)),
        shareToken: nid("share").replace("share_", ""),
        womenOnly: cluster.womenOnly,
      },
    });
  }

  await prisma.cluster.update({ where: { id: cluster.id }, data: { status: "assigned" } });
  await audit({
    actorId: opts.staffId,
    actorName: opts.staffName,
    action: opts.source === "override" ? "assignment.override" : "assignment.confirm",
    entity: "cluster",
    entityId: cluster.id,
    after: { driverId: driver.id, runId: run.id, reason: opts.reason ?? null },
  });
  return run.id;
}

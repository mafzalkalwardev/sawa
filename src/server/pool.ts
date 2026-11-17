import { prisma } from "@/lib/db";
import { nid } from "@/lib/ids";
import { tellDriver, tellRider } from "@/server/updates";

export const POOL_SEATS = 4;

export const HOLDING = ["queued", "accepted", "agreed", "ordered"] as const;

export function holdsSeat(status: string) {
  return (HOLDING as readonly string[]).includes(status);
}

/** A fuller van costs less. One rider pays the listed seat price. */
export function pooledFare(listAed: number, riders: number) {
  const count = Math.min(POOL_SEATS, Math.max(1, riders));
  return Math.max(1, Math.round((listAed * POOL_SEATS) / (POOL_SEATS + count - 1)));
}

export async function joinSharedPool(input: {
  routeId: string;
  serviceDate: string;
  shift: string;
  windowLabel: string;
  product: string;
  womenOnly: boolean;
  listAed: number;
  customerId: string;
}) {
  const open = await prisma.pool.findMany({
    where: {
      routeId: input.routeId,
      serviceDate: input.serviceDate,
      shift: input.shift,
      windowLabel: input.windowLabel,
      product: input.product,
      rideMode: "shared",
      womenOnly: input.womenOnly,
      status: { in: ["open", "full", "confirmed"] },
    },
    include: { requests: true },
    orderBy: { createdAt: "asc" },
  });
  const taken = (pool: (typeof open)[number]) => pool.requests.filter((item) => holdsSeat(item.status));
  const existing = open.find((pool) => {
    const riding = taken(pool);
    return riding.length < pool.seats && !riding.some((item) => item.customerId === input.customerId);
  });
  if (existing) return { pool: existing, waiting: false };
  const crowded = open
    .filter((pool) => !taken(pool).some((item) => item.customerId === input.customerId))
    .sort((a, b) => a.requests.filter((item) => item.status === "waiting").length - b.requests.filter((item) => item.status === "waiting").length)[0];
  if (crowded) return { pool: crowded, waiting: true };
  const created = await prisma.pool.create({
    data: {
      id: nid("pool"),
      routeId: input.routeId,
      serviceDate: input.serviceDate,
      shift: input.shift,
      windowLabel: input.windowLabel,
      product: input.product,
      rideMode: "shared",
      womenOnly: input.womenOnly,
      seats: POOL_SEATS,
      listAed: input.listAed,
      status: "open",
    },
    include: { requests: true },
  });
  return { pool: created, waiting: false };
}

/** Reprice seats still waiting for a driver, promote the oldest waitlist rider when a seat is free, and set the van status. */
export async function refreshPool(poolId: string) {
  const pool = await prisma.pool.findUnique({
    where: { id: poolId },
    include: { requests: { orderBy: { createdAt: "asc" } } },
  });
  if (!pool) return;
  const holding = pool.requests.filter((item) => holdsSeat(item.status));
  const promoted: typeof holding = [];
  for (const waiter of pool.requests.filter((item) => item.status === "waiting")) {
    if (holding.length >= pool.seats) break;
    if (holding.some((item) => item.customerId === waiter.customerId)) {
      await prisma.rideRequest.update({ where: { id: waiter.id }, data: { status: "cancelled" } });
      continue;
    }
    const status = pool.driverId ? "accepted" : "queued";
    await prisma.rideRequest.update({
      where: { id: waiter.id },
      data: { status, driverId: pool.driverId, offerAed: pooledFare(pool.listAed, holding.length + 1) },
    });
    holding.push({ ...waiter, status, driverId: pool.driverId });
    promoted.push(waiter);
  }
  const repriced = holding.filter((item) => item.status === "queued" || promoted.some((waiter) => waiter.id === item.id));
  if (repriced.length) {
    await prisma.rideRequest.updateMany({
      where: { id: { in: repriced.map((item) => item.id) } },
      data: { offerAed: pooledFare(pool.listAed, holding.length) },
    });
  }
  for (const waiter of promoted) {
    const person = await prisma.customer.findUnique({ where: { id: waiter.customerId } });
    const first = person?.fullName.split(" ")[0] || "A passenger";
    if (pool.driverId) {
      await prisma.chatThread.upsert({
        where: { requestId: waiter.id },
        update: { driverId: pool.driverId, customerId: waiter.customerId },
        create: { id: nid("chat"), requestId: waiter.id, driverId: pool.driverId, customerId: waiter.customerId },
      });
      const driver = await prisma.driver.findUnique({ where: { id: pool.driverId } });
      await tellRider(waiter.customerId, "waitlist", `${driver?.displayName || "The driver"} has a seat for you. Agree the price to confirm.`, `${driver?.displayName || "السائق"} لديه مقعد لك. وافق على السعر للتأكيد.`);
      await tellDriver(pool.driverId, "waitlist", `${first} moved off the waitlist.`, `${first} انتقل من قائمة الانتظار.`);
    } else {
      await tellRider(waiter.customerId, "waitlist", "A seat opened. You are waiting for a driver.", "فُتح مقعد. أنت بانتظار سائق.");
    }
  }
  const allOrdered = holding.length > 0 && holding.every((item) => item.status === "ordered");
  const status = holding.length >= pool.seats ? (allOrdered ? "confirmed" : "full") : allOrdered ? "confirmed" : "open";
  if (pool.status !== status) await prisma.pool.update({ where: { id: pool.id }, data: { status } });
}

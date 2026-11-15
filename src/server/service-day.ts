import { prisma } from "@/lib/db";
import { nid, pinCode, shareToken } from "@/lib/ids";
import { addDays, dubaiToday } from "@/lib/time";
import { createRun } from "./runs";

export async function ensureServiceDay(date = dubaiToday()) {
  const driver = await prisma.driver.findUnique({ where: { phone: "+971501000002" } });
  const route = await prisma.route.findUnique({ where: { slug: "sharjah-dubai" } });
  const youssef = await prisma.customer.findUnique({ where: { phone: "+971501000010" } });
  if (!driver?.defaultVehicleId || !route || !youssef) return;

  let run = await prisma.run.findFirst({
    where: {
      driverId: driver.id,
      routeId: route.id,
      serviceDate: date,
      shift: "morning",
      status: { not: "cancelled" },
    },
  });

  if (!run) {
    const assignment = await prisma.assignment.create({
      data: {
        id: nid("asg"),
        driverId: driver.id,
        vehicleId: driver.defaultVehicleId,
        routeId: route.id,
        source: "locked",
        reason: "Monthly pass rolled forward",
        serviceDate: date,
        shift: "morning",
        status: "confirmed",
        locked: true,
      },
    });
    run = await createRun({
      routeId: route.id,
      driverId: driver.id,
      vehicleId: driver.defaultVehicleId,
      serviceDate: date,
      shift: "morning",
      assignmentId: assignment.id,
    });
  }

  const booking = await prisma.booking.findFirst({
    where: { customerId: youssef.id, serviceDate: date, shift: "morning", routeId: route.id, status: { not: "cancelled" } },
  });
  if (!booking) {
    const pickup = await prisma.stop.findFirst({ where: { routeId: route.id, slug: "nahda-shj" } });
    const drop = await prisma.stop.findFirst({ where: { routeId: route.id, slug: "union" } });
    if (pickup && drop) {
      await prisma.booking.create({
        data: {
          id: nid("bkg"),
          customerId: youssef.id,
          runId: run.id,
          routeId: route.id,
          serviceDate: date,
          shift: "morning",
          windowLabel: "7:00–8:10",
          pickupStopId: pickup.id,
          dropStopId: drop.id,
          product: "monthly",
          priceAed: 0,
          status: "confirmed",
          pin: pinCode(),
          shareToken: shareToken(),
          womenOnly: false,
        },
      });
    }
  }

  const yesterday = addDays(date, -1);
  const layla = await prisma.customer.findUnique({ where: { phone: "+971501000001" } });
  if (layla) {
    const past = await prisma.booking.findFirst({
      where: { customerId: layla.id, serviceDate: yesterday, status: "completed" },
    });
    if (!past) {
      const pickup = await prisma.stop.findFirst({ where: { routeId: route.id, slug: "rolla" } });
      const drop = await prisma.stop.findFirst({ where: { routeId: route.id, slug: "fahidi" } });
      if (pickup && drop && driver.defaultVehicleId) {
        const pastRun = await createRun({
          routeId: route.id,
          driverId: driver.id,
          vehicleId: driver.defaultVehicleId,
          serviceDate: yesterday,
          shift: "evening",
          status: "completed",
        });
        await prisma.booking.create({
          data: {
            id: nid("bkg"),
            customerId: layla.id,
            runId: pastRun.id,
            routeId: route.id,
            serviceDate: yesterday,
            shift: "evening",
            windowLabel: "17:40–19:00",
            pickupStopId: pickup.id,
            dropStopId: drop.id,
            product: "single",
            priceAed: 25,
            status: "completed",
            pin: pinCode(),
            shareToken: shareToken(),
          },
        });
      }
    }
  }
}

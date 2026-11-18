import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { nid } from "@/lib/ids";

export async function createRun(opts: {
  routeId: string;
  driverId: string;
  vehicleId: string;
  serviceDate: string;
  shift: string;
  assignmentId?: string | null;
  status?: string;
}) {
  const stops = await prisma.stop.findMany({
    where: { routeId: opts.routeId },
    orderBy: { sequence: "asc" },
  });
  const existing = await prisma.run.findFirst({
    where: { driverId: opts.driverId, serviceDate: opts.serviceDate, shift: opts.shift, status: { not: "cancelled" } },
  });
  if (existing) return existing;
  try {
    const run = await prisma.run.create({
      data: {
        id: nid("run"),
        assignmentId: opts.assignmentId ?? null,
        routeId: opts.routeId,
        driverId: opts.driverId,
        vehicleId: opts.vehicleId,
        serviceDate: opts.serviceDate,
        shift: opts.shift,
        status: opts.status ?? "scheduled",
      },
    });
    if (stops.length) {
      await prisma.stopEvent.createMany({
        data: stops.map((stop, index) => ({
          id: nid("sev"),
          runId: run.id,
          stopId: stop.id,
          sequence: index,
          plannedOffsetMin: index * 8,
          status: "pending",
        })),
      });
    }
    return run;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const again = await prisma.run.findFirst({
        where: { driverId: opts.driverId, serviceDate: opts.serviceDate, shift: opts.shift, status: { not: "cancelled" } },
      });
      if (again) return again;
    }
    throw error;
  }
}

export async function seatsFree(runId: string) {
  const run = await prisma.run.findUnique({
    where: { id: runId },
    include: { vehicle: true, bookings: true },
  });
  if (!run) return 0;
  const used = run.bookings.filter((b) => ["confirmed", "boarded", "completed"].includes(b.status)).length;
  return Math.max(0, run.vehicle.seatCapacity - used);
}

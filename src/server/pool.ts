import { prisma } from "@/lib/db";
import { nid } from "@/lib/ids";

export const POOL_SEATS = 4;

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
      status: "open",
    },
    include: { requests: true },
    orderBy: { createdAt: "asc" },
  });
  const existing = open.find((pool) => {
    const riding = pool.requests.filter((item) => item.status !== "ordered");
    return riding.length < pool.seats && !riding.some((item) => item.customerId === input.customerId);
  });
  if (existing) return existing;
  return prisma.pool.create({
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
}

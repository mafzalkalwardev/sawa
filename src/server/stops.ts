import { prisma } from "@/lib/db";
import { quoteToll } from "@/lib/tolls";

export async function priceForStops(input: {
  routeId: string;
  serviceDate: string;
  windowLabel: string;
  product: string;
  rideMode: string;
  pickupStopId: string;
  dropStopId: string;
  nextPickupId: string;
  nextDropId: string;
  priceAed: number;
}) {
  const route = await prisma.route.findUnique({ where: { id: input.routeId } });
  const stops = await prisma.stop.findMany({ where: { routeId: input.routeId } });
  const pickup = stops.find((stop) => stop.id === input.pickupStopId);
  const drop = stops.find((stop) => stop.id === input.dropStopId);
  const nextPickup = stops.find((stop) => stop.id === input.nextPickupId);
  const nextDrop = stops.find((stop) => stop.id === input.nextDropId);
  if (!route || !nextPickup || !nextDrop || nextPickup.routeId !== route.id || nextDrop.routeId !== route.id) return null;
  if (nextPickup.id === nextDrop.id) return { error: "same" as const };
  if (pickup && drop && nextPickup.id === pickup.id && nextDrop.id === drop.id) return { error: "unchanged" as const };
  const mode = input.rideMode === "private" ? "private" : "shared";
  const trips = input.product === "monthly" ? 22 : 1;
  const charged = (from: { slug: string }, to: { slug: string }) => quoteToll({
    routeSlug: route.slug,
    stops,
    pickupSlug: from.slug,
    dropSlug: to.slug,
    serviceDate: input.serviceDate,
    windowLabel: input.windowLabel,
    rideMode: mode,
    trips,
  }).chargedAed;
  const previous = pickup && drop ? charged(pickup, drop) : 0;
  const priceAed = Math.max(1, input.priceAed - previous + charged(nextPickup, nextDrop));
  return { error: null, priceAed, pickup: nextPickup, drop: nextDrop };
}

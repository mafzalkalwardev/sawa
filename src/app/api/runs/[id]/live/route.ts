import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { awayFromRoadKm, drive, onRoad } from "@/server/routing";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await getSession();
  const run = await prisma.run.findUnique({
    where: { id },
    include: {
      driver: true,
      vehicle: true,
      route: { include: { stops: { orderBy: { sequence: "asc" } } } },
      bookings: true,
      stopEvents: { orderBy: { sequence: "asc" } },
    },
  });
  if (!run) return NextResponse.json({ error: "missing" }, { status: 404 });
  const allowed =
    session?.kind === "staff" ||
    (session?.kind === "driver" && session.id === run.driverId) ||
    (session?.kind === "rider" && run.bookings.some((booking) => booking.customerId === session.id));
  if (!allowed) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const road = await drive(run.route.stops);
  const pending = run.stopEvents.find((event) => event.status !== "arrived");
  const next = pending ? run.route.stops.find((stop) => stop.id === pending.stopId) : run.route.stops.at(-1);
  const live = run.driver.liveLat != null && run.driver.liveLng != null
    ? { lat: run.driver.liveLat, lng: run.driver.liveLng }
    : null;
  const liveOnRoad = live != null && onRoad(live, road.path);
  const base = run.driver.baseLat != null && run.driver.baseLng != null
    ? { lat: run.driver.baseLat, lng: run.driver.baseLng }
    : null;
  const fallback = base && onRoad(base, road.path)
    ? base
    : { lat: run.route.stops[0].lat, lng: run.route.stops[0].lng };
  const marker = liveOnRoad && live ? live : fallback;
  const ping = await prisma.locationPing.findFirst({ where: { driverId: run.driverId }, orderBy: { createdAt: "desc" } });
  const awayKm = ping ? awayFromRoadKm(ping, road.path) : null;
  const etaMin = next ? (await drive([marker, next])).durationMin : null;
  return NextResponse.json({
    lat: marker?.lat ?? null,
    lng: marker?.lng ?? null,
    etaMin,
    awayKm,
    road: road.source,
    nextStop: next?.nameEn ?? null,
    delayNote: run.delayNote,
    plate: run.vehicle.plate,
    driver: run.driver.displayName,
    path: road.path,
    points: [
      ...run.route.stops.map((stop) => ({ id: stop.id, lat: stop.lat, lng: stop.lng, label: stop.nameEn, kind: "stop" })),
      ...(marker ? [{ id: "live", lat: marker.lat, lng: marker.lng, label: run.driver.displayName, kind: "live" }] : []),
    ],
  });
}

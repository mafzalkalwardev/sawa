import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { awayFromRoadKm, drive, minutesAlong, onRoad } from "@/server/routing";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const locale = new URL(_request.url).searchParams.get("locale") === "ar" ? "ar" : "en";
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
  let next = pending ? run.route.stops.find((stop) => stop.id === pending.stopId) : run.route.stops.at(-1);
  if (session?.kind === "rider") {
    const booking = run.bookings.find((item) => item.customerId === session.id && item.status !== "cancelled");
    if (booking) {
      const stopId = booking.status === "boarded" ? booking.dropStopId : booking.pickupStopId;
      next = run.route.stops.find((stop) => stop.id === stopId) ?? next;
    }
  }
  const live = run.driver.liveLat != null && run.driver.liveLng != null
    ? { lat: run.driver.liveLat, lng: run.driver.liveLng }
    : null;
  const ping = await prisma.locationPing.findFirst({ where: { driverId: run.driverId }, orderBy: { createdAt: "desc" } });
  const awayKm = ping ? awayFromRoadKm(ping, road.path) : null;
  const liveOnRoad = live != null && awayKm == null && onRoad(live, road.path);
  const base = run.driver.baseLat != null && run.driver.baseLng != null
    ? { lat: run.driver.baseLat, lng: run.driver.baseLng }
    : null;
  const fallback = base && onRoad(base, road.path)
    ? base
    : { lat: run.route.stops[0].lat, lng: run.route.stops[0].lng };
  const marker = liveOnRoad && live ? live : fallback;
  const progress = liveOnRoad && live && next ? minutesAlong(road, live, next) : { minutes: null, passed: false };
  return NextResponse.json({
    lat: marker?.lat ?? null,
    lng: marker?.lng ?? null,
    etaMin: progress.minutes,
    passed: progress.passed,
    awayKm,
    road: road.source,
    nextStop: next?.nameEn ?? null,
    nextStopEn: next?.nameEn ?? null,
    nextStopAr: next?.nameAr ?? null,
    delayNote: run.delayNote,
    plate: run.vehicle.plate,
    driver: run.driver.displayName,
    path: road.path,
    points: [
      ...run.route.stops.map((stop) => ({ id: stop.id, lat: stop.lat, lng: stop.lng, label: locale === "ar" ? stop.nameAr : stop.nameEn, kind: "stop" })),
      ...(marker ? [{ id: "live", lat: marker.lat, lng: marker.lng, label: run.driver.displayName, kind: "live" }] : []),
    ],
  });
}

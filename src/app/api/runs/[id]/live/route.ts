import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { haversineKm, minutesAtPeak } from "@/lib/geo";

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
  const pending = run.stopEvents.find((event) => event.status !== "arrived");
  const next = pending ? run.route.stops.find((stop) => stop.id === pending.stopId) : run.route.stops.at(-1);
  const eta = run.driver.liveLat != null && run.driver.liveLng != null && next
    ? minutesAtPeak(haversineKm({ lat: run.driver.liveLat, lng: run.driver.liveLng }, next))
    : null;
  return NextResponse.json({
    lat: run.driver.liveLat,
    lng: run.driver.liveLng,
    etaMin: eta,
    nextStop: next?.nameEn ?? null,
    delayNote: run.delayNote,
    plate: run.vehicle.plate,
    driver: run.driver.displayName,
    path: run.route.stops.map((stop) => [stop.lat, stop.lng]),
    points: [
      ...run.route.stops.map((stop) => ({ id: stop.id, lat: stop.lat, lng: stop.lng, label: stop.nameEn, kind: "stop" })),
      ...(run.driver.liveLat != null && run.driver.liveLng != null
        ? [{ id: "live", lat: run.driver.liveLat, lng: run.driver.liveLng, label: run.driver.displayName, kind: "live" }]
        : []),
    ],
  });
}

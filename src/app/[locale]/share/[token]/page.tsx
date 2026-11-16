import { notFound } from "next/navigation";
import { MapView } from "@/components/map";
import { prisma } from "@/lib/db";
import { drive, onRoad } from "@/server/routing";

export const metadata = { robots: { index: false, follow: false } };

export default async function SharePage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale, token } = await params;
  const booking = await prisma.booking.findUnique({
    where: { shareToken: token },
    include: { run: { include: { driver: true, vehicle: true, route: { include: { stops: true } } } } },
  });
  if (!booking) notFound();
  const ar = locale === "ar";
  const pickup = await prisma.stop.findUnique({ where: { id: booking.pickupStopId } });
  const driver = booking.run?.driver;
  const stops = [...(booking.run?.route.stops ?? [])].sort((a, b) => a.sequence - b.sequence);
  const road = stops.length ? await drive(stops) : null;
  const live = driver?.liveLat != null && driver.liveLng != null ? { lat: driver.liveLat, lng: driver.liveLng } : null;
  const marker = road && live && onRoad(live, road.path) ? live : stops[0] ? { lat: stops[0].lat, lng: stops[0].lng } : null;
  const eta = marker && pickup ? (await drive([marker, pickup])).durationMin : null;
  return (
    <main className="wrap section">
      <p className="banner">{ar ? "مشاركة رحلة. ليست خدمة طوارئ." : "Shared trip. Not an emergency service."}</p>
      <h1>{booking.run ? (ar ? booking.run.route.nameAr : booking.run.route.nameEn) : (ar ? "بانتظار مركبة" : "Waiting for a vehicle")}</h1>
      <p>{driver?.displayName} · {booking.run?.vehicle.plate}</p>
      <p>{pickup ? (ar ? pickup.nameAr : pickup.nameEn) : ""}{eta != null ? ` · ${eta} min` : ""}</p>
      {booking.run ? (
        <MapView
          points={[
            ...stops.map((stop) => ({ id: stop.id, lat: stop.lat, lng: stop.lng, label: ar ? stop.nameAr : stop.nameEn, kind: "stop" as const })),
            ...(marker && driver ? [{ id: "live", lat: marker.lat, lng: marker.lng, label: driver.displayName, kind: "live" as const }] : []),
          ]}
          path={road?.path ?? []}
        />
      ) : null}
    </main>
  );
}

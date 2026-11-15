import { notFound } from "next/navigation";
import { MapView } from "@/components/map";
import { prisma } from "@/lib/db";
import { haversineKm, minutesAtPeak } from "@/lib/geo";

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
  const eta = driver?.liveLat != null && pickup ? minutesAtPeak(haversineKm({ lat: driver.liveLat, lng: driver.liveLng || 0 }, pickup)) : null;
  return (
    <main className="wrap section">
      <p className="banner">{ar ? "مشاركة رحلة. ليست خدمة طوارئ." : "Shared trip. Not an emergency service."}</p>
      <h1>{booking.run ? (ar ? booking.run.route.nameAr : booking.run.route.nameEn) : (ar ? "بانتظار مركبة" : "Waiting for a vehicle")}</h1>
      <p>{driver?.displayName} · {booking.run?.vehicle.plate}</p>
      <p>{pickup ? (ar ? pickup.nameAr : pickup.nameEn) : ""}{eta != null ? ` · ${eta} min` : ""}</p>
      {booking.run ? (
        <MapView
          points={(booking.run.route.stops || []).map((stop) => ({ id: stop.id, lat: stop.lat, lng: stop.lng, label: ar ? stop.nameAr : stop.nameEn }))}
          path={booking.run.route.stops.map((stop) => [stop.lat, stop.lng])}
        />
      ) : null}
    </main>
  );
}

import { MapView } from "@/components/map";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function RoutesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireStaff(locale);
  const routes = await prisma.route.findMany({ include: { stops: { orderBy: { sequence: "asc" } } } });
  const ar = locale === "ar";
  return (
    <>
      <h1>{ar ? "المسارات" : "Routes"}</h1>
      {routes.map((route) => (
        <section key={route.id} className="card">
          <h2>{ar ? route.nameAr : route.nameEn}</h2>
          <p>{route.seatPriceAed} / {route.monthlyPriceAed} AED {route.womenOnlyAvailable ? "· women-only supply" : ""}</p>
          <MapView points={route.stops.map((stop) => ({ id: stop.id, lat: stop.lat, lng: stop.lng, label: stop.nameEn }))} path={route.stops.map((stop) => [stop.lat, stop.lng])} />
          <ol>{route.stops.map((stop) => <li key={stop.id}>{stop.sequence + 1}. {ar ? stop.nameAr : stop.nameEn} ({stop.lat.toFixed(3)}, {stop.lng.toFixed(3)})</li>)}</ol>
        </section>
      ))}
    </>
  );
}

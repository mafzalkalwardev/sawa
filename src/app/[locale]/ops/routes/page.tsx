import { MapView } from "@/components/map";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { drive } from "@/server/routing";

export default async function RoutesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireStaff(locale);
  const routes = await prisma.route.findMany({ include: { stops: { orderBy: { sequence: "asc" } } } });
  const roads = await Promise.all(routes.map((route) => drive(route.stops)));
  const ar = locale === "ar";
  return (
    <>
      <h1>{ar ? "المسارات" : "Routes"}</h1>
      {routes.map((route, index) => (
        <section key={route.id} className="card">
          <h2>{ar ? route.nameAr : route.nameEn}</h2>
          <p>{route.seatPriceAed} / {route.monthlyPriceAed} AED {route.womenOnlyAvailable ? "· women-only supply" : ""}</p>
          <MapView points={route.stops.map((stop) => ({ id: stop.id, lat: stop.lat, lng: stop.lng, label: stop.nameEn }))} path={roads[index].path} />
          <ol>{route.stops.map((stop) => <li key={stop.id}>{stop.sequence + 1}. {ar ? stop.nameAr : stop.nameEn} ({stop.lat.toFixed(3)}, {stop.lng.toFixed(3)})</li>)}</ol>
        </section>
      ))}
    </>
  );
}

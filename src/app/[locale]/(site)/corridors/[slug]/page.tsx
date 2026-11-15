import { notFound } from "next/navigation";
import { MapView } from "@/components/map";
import { pageMeta } from "@/lib/seo";
import { prisma } from "@/lib/db";
import { aed } from "@/lib/time";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const route = await prisma.route.findUnique({ where: { slug } });
  if (!route) return {};
  return pageMeta(locale, `corridors/${slug}`, locale === "ar" ? route.nameAr : route.nameEn, locale === "ar" ? route.summaryAr : route.summaryEn);
}

export default async function CorridorPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const route = await prisma.route.findUnique({ where: { slug }, include: { stops: { orderBy: { sequence: "asc" } } } });
  if (!route) notFound();
  const ar = locale === "ar";
  return (
    <article className="section">
      <p className="eyebrow">{ar ? "ممر" : "Corridor"}</p>
      <h1>{ar ? route.nameAr : route.nameEn}</h1>
      <p className="lead">{ar ? route.detailAr : route.detailEn}</p>
      <p className="price">{aed(route.seatPriceAed, locale)} <span className="muted">{ar ? "للمقعد · تجريبي" : "per seat · demo"}</span></p>
      <p>{ar ? route.morningTimetableAr : route.morningTimetableEn}</p>
      <p>{ar ? route.eveningTimetableAr : route.eveningTimetableEn}</p>
      <MapView
        points={route.stops.map((stop) => ({ id: stop.id, lat: stop.lat, lng: stop.lng, label: ar ? stop.nameAr : stop.nameEn, kind: "stop" as const }))}
        path={route.stops.map((stop) => [stop.lat, stop.lng])}
      />
      <ol>
        {route.stops.map((stop) => (
          <li key={stop.id}><strong>{ar ? stop.nameAr : stop.nameEn}</strong> — {stop.emirate}. {ar ? stop.landmarkAr : stop.landmarkEn}</li>
        ))}
      </ol>
      {route.womenOnlyAvailable ? <p>{ar ? "يمكن طلب رحلة نساء فقط عندما تتوفر مركبة مرخّصة لذلك." : "A women-only run can be requested when a vehicle licensed for that service is on the corridor."}</p> : <p>{ar ? "لا توجد رحلة نساء فقط على هذا الممر في بيانات العرض." : "This demo corridor has no women-only vehicle."}</p>}
    </article>
  );
}

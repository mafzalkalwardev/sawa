import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import { prisma } from "@/lib/db";
import { aed } from "@/lib/time";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return pageMeta(locale, "corridors", locale === "ar" ? "ممرات التنقل" : "Commute corridors", locale === "ar" ? "ممرات سوى المعلنة وأسعار المقاعد التجريبية." : "Sawa’s published corridors and demo seat prices.");
}

export default async function CorridorsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const routes = await prisma.route.findMany({ include: { stops: { orderBy: { sequence: "asc" } } }, orderBy: { nameEn: "asc" } });
  const ar = locale === "ar";
  return (
    <article className="section">
      <h1>{ar ? "ثلاثة ممرات، مواقف معلنة." : "Three corridors, published stops."}</h1>
      <p className="lead">{ar ? "الأسعار أدناه توضيحية لهذا العرض وليست تعرفة معتمدة." : "Prices below are illustrative for this demo. They are not an approved tariff."}</p>
      <div className="stack">
        {routes.map((route) => (
          <section key={route.id} className="card">
            <h2><Link href={`/${locale}/corridors/${route.slug}`}>{ar ? route.nameAr : route.nameEn}</Link></h2>
            <p>{ar ? route.summaryAr : route.summaryEn}</p>
            <p>{ar ? `المقعد ${aed(route.seatPriceAed, locale)} · الشهري ${aed(route.monthlyPriceAed, locale)}` : `Seat ${aed(route.seatPriceAed, locale)} · Monthly ${aed(route.monthlyPriceAed, locale)}`}</p>
            <p className="muted">{route.stops.map((stop) => (ar ? stop.nameAr : stop.nameEn)).join(" · ")}</p>
          </section>
        ))}
      </div>
    </article>
  );
}

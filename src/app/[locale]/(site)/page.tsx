import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { pageMeta } from "@/lib/seo";
import { prisma } from "@/lib/db";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return pageMeta(
    locale,
    "",
    locale === "ar" ? "مقاعد مشتركة مرخّصة للتنقل في الإمارات" : "Licensed shared seats for UAE commutes",
    locale === "ar"
      ? "سوى تحجز مقعدًا على مركبة مشتركة مرخّصة لممرات الشارقة–دبي وعجمان–دبي ودبي–أبوظبي. ليست سوقًا لسيارات خاصة."
      : "Sawa reserves a seat on a licensed shared vehicle for Sharjah–Dubai, Ajman–Dubai, and Dubai–Abu Dhabi. It is not a private-car marketplace.",
  );
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const ar = locale === "ar";
  const routes = await prisma.route.findMany({ where: { active: true }, orderBy: { nameEn: "asc" } });
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Sawa",
          description: "Licensed shared-commute booking for UAE corridors. Not a private-car lift marketplace.",
          areaServed: "AE",
          url: process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000",
        }}
      />
      <section className="hero">
        <div>
          <p className="eyebrow">{ar ? "الشارقة · عجمان · دبي · أبوظبي" : "Sharjah · Ajman · Dubai · Abu Dhabi"}</p>
          <h1>{ar ? "رحلتك تنتظر سائقًا على نفس الممر." : "Your ride waits for a driver on the same corridor."}</h1>
          <div className="choice-grid">
            <Link className="choice" href={`/${locale}/ride/book?product=single`}>
              <span><strong>{ar ? "رحلة يوم" : "One-day ride"}</strong><span>{ar ? "مقعد أو مركبة لهذا اليوم" : "A seat or the vehicle for one day"}</span></span>
              <strong>→</strong>
            </Link>
            <Link className="choice" href={`/${locale}/ride/book?product=monthly`}>
              <span><strong>{ar ? "اشتراك شهري" : "Monthly ride"}</strong><span>{ar ? "نفس الطريق، أيام العمل" : "The same road, every working day"}</span></span>
              <strong>→</strong>
            </Link>
          </div>
          <div className="row">
            <a className="btn" href="/sawa.apk">{ar ? "تنزيل تطبيق أندرويد" : "Download the Android app"}</a>
            <a className="btn ghost" href="/sawa-store.apk">{ar ? "نسخة المتجر المنفصلة" : "Separate store build"}</a>
            <p className="muted">{ar ? "نسخة المتجر تطبيق منفصل يُثبَّت بجانب تطبيق التجربة. ليست على متجر جوجل." : "The store build is a separate app that installs beside the test app. It is not on Google Play."}</p>
          </div>
        </div>
      </section>
      <section className="section">
        <h2>{ar ? "الممرات" : "Corridors"}</h2>
        <div className="grid">
          {routes.map((route) => (
            <Link key={route.id} className="card" href={`/${locale}/corridors/${route.slug}`}>
              <h3>{ar ? route.nameAr : route.nameEn}</h3>
              <p className="price">{ar ? `${route.seatPriceAed} د.إ للمقعد` : `AED ${route.seatPriceAed} a seat`}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

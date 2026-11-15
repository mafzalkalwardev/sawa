import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { faq } from "@/content/network";
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
          <p className="eyebrow">{ar ? "تنقّل مشترك مرخّص" : "Licensed shared commute"}</p>
          <h1>{ar ? "مقعد محجوز على فان مرخّص، لا توصيلة من سيارة خاصة." : "A reserved seat on a licensed van, not a private-car lift."}</h1>
          <p className="lead">
            {ar
              ? "سوى تحجز مقعدك على مركبة مشتركة مرخّصة بين الشارقة ودبي، وعجمان ودبي، ودبي وأبوظبي. الشاشة الأولى جدول ومواقف معلنة، وليست دبوسًا على الخريطة."
              : "Sawa books your seat on a licensed shared vehicle between Sharjah and Dubai, Ajman and Dubai, and Dubai and Abu Dhabi. The home screen is a timetable and published stops, not a map pin."}
          </p>
          <div className="row">
            <Link className="btn" href={`/${locale}/ride/book`}>{ar ? "احجز مقعدًا" : "Book a seat"}</Link>
            <Link className="btn ghost" href={`/${locale}/how-it-works`}>{ar ? "كيف يعمل" : "How it works"}</Link>
          </div>
          <ol className="route-diagram">
            <li>{ar ? "الشارقة" : "Sharjah"}</li>
            <li>{ar ? "النهدة" : "Al Nahda"}</li>
            <li>{ar ? "دبي" : "Dubai"}</li>
          </ol>
        </div>
        <aside className="card">
          <h2>{ar ? "ما الذي لا تفعله سوى" : "What Sawa does not do"}</h2>
          <p>{ar ? "لا تسمح لمالك سيارة خاصة بعرض مقاعد مدفوعة للغرباء. نقل الركاب بأجر في مركبة غير مرخّصة مخالفة في دبي." : "It does not let a private-car owner sell paid seats to strangers. Paid carriage in an unlicensed vehicle is an offence in Dubai."}</p>
          <p className="muted">{ar ? "هذا برنامج عرض. نقل الركاب الحقيقي يحتاج موافقات هيئة الطرق في دبي والشارقة ومركز النقل المتكامل في أبوظبي." : "This is demonstration software. Real passengers need comfort from Dubai RTA, Sharjah RTA, and Abu Dhabi’s Integrated Transport Centre."}</p>
        </aside>
      </section>
      <section className="section">
        <h2>{ar ? "الممرات" : "Corridors"}</h2>
        <div className="grid">
          {routes.map((route) => (
            <Link key={route.id} className="card" href={`/${locale}/corridors/${route.slug}`}>
              <h3>{ar ? route.nameAr : route.nameEn}</h3>
              <p>{ar ? route.summaryAr : route.summaryEn}</p>
              <p className="price">{ar ? `${route.seatPriceAed} د.إ للمقعد` : `AED ${route.seatPriceAed} a seat`}</p>
            </Link>
          ))}
        </div>
      </section>
      <section className="split">
        <article>
          <h2>{ar ? "لمن هذا" : "Who it is for"}</h2>
          <p>{ar ? "للموظفين والجامعات على ممرات بين الإمارات، حيث يعيش الناس في الشارقة أو عجمان ويعملون في دبي. السعر يجب أن يكون أوضح من السيارة المنفردة وأقرب من الحافلة." : "Employees and campuses on inter-emirate corridors, where people live in Sharjah or Ajman and work in Dubai. The price has to beat solo driving on cost and beat the bus on time and walking distance."}</p>
        </article>
        <article>
          <h2>{ar ? "أسئلة قصيرة" : "Short answers"}</h2>
          {faq.slice(0, 3).map((item) => (
            <p key={item.qEn}><strong>{ar ? item.qAr : item.qEn}</strong> {ar ? item.aAr : item.aEn}</p>
          ))}
          <Link href={`/${locale}/faq`}>{ar ? "كل الأسئلة" : "All questions"}</Link>
        </article>
      </section>
    </>
  );
}

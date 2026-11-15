import { pageMeta } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return pageMeta(locale, "safety", locale === "ar" ? "السلامة" : "Safety", locale === "ar" ? "كيف تتعامل سوى مع التنبيه والموقع والمستندات." : "How Sawa handles alerts, location, and documents.");
}

export default async function SafetyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const ar = locale === "ar";
  return (
    <article className="section">
      <h1>{ar ? "السلامة شرط تشغيل، لا شارة تسويق." : "Safety is an operating condition, not a badge."}</h1>
      <div className="stack">
        <section className="card">
          <h2>{ar ? "من يقود" : "Who drives"}</h2>
          <p>{ar ? "السائقون يُدرَجون من الموظفين لدى مشغّل مرخّص. لا يمكن بدء الوردية قبل اعتماد الهوية والرخصة والتصريح والتأمين." : "Drivers are enrolled by staff at a licensed operator. A shift cannot start until identity, licence, permit, and insurance are approved."}</p>
        </section>
        <section className="card">
          <h2>{ar ? "أثناء الرحلة" : "On the trip"}</h2>
          <p>{ar ? "ترى اللوحة واسم السائق والوصول المتوقع. زر التنبيه يفتح تذكرة عاجلة للعمليات. للشرطة 999 ولشرطة دبي 901 وللإسعاف 998. سوى ليست خدمة طوارئ عامة." : "You see the plate, the driver, and an ETA. The alert button opens an urgent ticket for operations. Police 999, Dubai Police 901, ambulance 998. Sawa is not a public emergency service."}</p>
        </section>
        <section className="card">
          <h2>{ar ? "الموقع" : "Location"}</h2>
          <p>{ar ? "موقع السائق يُرسل أثناء الوردية ويتوقف عند نهايتها. موقع الراكب يُستخدم في شاشة الرحلة فقط." : "Driver location is sent during a shift and stops when the shift ends. Rider location is used on the trip screen only."}</p>
        </section>
        <section className="card">
          <h2>{ar ? "نساء فقط" : "Women only"}</h2>
          <p>{ar ? "التفضيل يُحفظ. الرحلة تُعرض فقط إذا كانت المركبة والسائقة مرخّصتين. لا تسويق لتوصيلات خاصة." : "The preference is stored. A run is offered only when the vehicle and driver are licensed for it. There is no marketing of private-car women-only lifts."}</p>
        </section>
      </div>
    </article>
  );
}

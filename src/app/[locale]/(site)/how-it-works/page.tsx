import { pageMeta } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return pageMeta(
    locale,
    "how-it-works",
    locale === "ar" ? "كيف تعمل سوى" : "How Sawa works",
    locale === "ar"
      ? "تحجز مقعدًا أو اشتراكًا على مسار مرخّص. العمليات تعيّن سائقًا معتمدًا. لا توجد مطابقة لسيارات خاصة."
      : "Book a seat or a pass on a licensed route. Operations assign an approved driver. There is no private-car match.",
  );
}

export default async function HowPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const ar = locale === "ar";
  const steps = ar
    ? [
        ["اختر الممر", "الشارقة–دبي أو عجمان–دبي أو دبي–أبوظبي، مع نافذة صباحية أو مسائية."],
        ["اختر موقفين", "الصعود والنزول من قائمة معلنة قرب المترو أو محطات الحافلات."],
        ["ادفع الأجرة المعروضة", "مقعد واحد أو اشتراك شهري. في هذا العرض البطاقة التجريبية فقط."],
        ["اصعد برمز", "ترى اللوحة والسائق ورمزًا من أربعة أرقام. السائق يأكّد الصعود."],
        ["العمليات تراقب", "التعيين من لوحة التخطيط، مع سبب مكتوب إذا تجاوز الموظف الترشيح."],
      ]
    : [
        ["Pick a corridor", "Sharjah–Dubai, Ajman–Dubai, or Dubai–Abu Dhabi, with a morning or evening window."],
        ["Pick two stops", "Board and alight at a published stop near a metro or bus hub."],
        ["Pay the fare you were shown", "A single seat or a monthly pass. This demo takes the test card only."],
        ["Board with a PIN", "You see the plate, the driver, and a four-digit PIN. The driver confirms boarding."],
        ["Operations stay in the loop", "Assignment happens on the planning board. An override needs a written reason."],
      ];
  return (
    <article className="section">
      <p className="eyebrow">{ar ? "الطريقة" : "The method"}</p>
      <h1>{ar ? "مقعد على رحلة مجدولة." : "A seat on a scheduled run."}</h1>
      <p className="lead">{ar ? "سوى ليست تطبيق تاكسي فوري. الوحدة الأساسية مقعد محجوز على مركبة مرخّصة." : "Sawa is not an instant-taxi app. The unit is a reserved seat on a licensed vehicle."}</p>
      <ol className="stack">
        {steps.map(([title, body]) => (
          <li key={title} className="card"><h2>{title}</h2><p>{body}</p></li>
        ))}
      </ol>
    </article>
  );
}

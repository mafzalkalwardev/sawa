import { JsonLd } from "@/components/json-ld";
import { faq } from "@/content/network";
import { pageMeta } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return pageMeta(locale, "faq", locale === "ar" ? "أسئلة شائعة" : "Frequently asked questions", locale === "ar" ? "إجابات مباشرة عن سوى والتنظيم والممرات والدفع." : "Direct answers about Sawa, licensing, corridors, and payment.");
}

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const ar = locale === "ar";
  return (
    <article className="section faq">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map((item) => ({
            "@type": "Question",
            name: ar ? item.qAr : item.qEn,
            acceptedAnswer: { "@type": "Answer", text: ar ? item.aAr : item.aEn },
          })),
        }}
      />
      <h1>{ar ? "إجابات قصيرة." : "Short answers."}</h1>
      {faq.map((item) => (
        <details key={item.qEn} open>
          <summary>{ar ? item.qAr : item.qEn}</summary>
          <p>{ar ? item.aAr : item.aEn}</p>
        </details>
      ))}
    </article>
  );
}

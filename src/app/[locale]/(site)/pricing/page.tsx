import { pageMeta } from "@/lib/seo";
import { prisma } from "@/lib/db";
import { aed } from "@/lib/time";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return pageMeta(locale, "pricing", locale === "ar" ? "أسعار العرض" : "Demo prices", locale === "ar" ? "أسعار مقاعد سوى التجريبية وقواعد الإلغاء." : "Sawa demo seat prices and the cancellation rule.");
}

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const routes = await prisma.route.findMany({ orderBy: { seatPriceAed: "asc" } });
  const ar = locale === "ar";
  return (
    <article className="section">
      <h1>{ar ? "سعر المقعد ظاهر قبل التأكيد." : "The seat price is shown before you confirm."}</h1>
      <p className="lead">{ar ? "لا مزايدة بين الراكب وسائق خاص. الأجرة ثابتة للعرض. الضريبة غير محسوبة هنا." : "There is no bid between a rider and a private driver. The demo fare is fixed. VAT is not calculated here."}</p>
      <table>
        <thead>
          <tr><th>{ar ? "الممر" : "Corridor"}</th><th>{ar ? "مقعد" : "Seat"}</th><th>{ar ? "شهري" : "Monthly"}</th></tr>
        </thead>
        <tbody>
          {routes.map((route) => (
            <tr key={route.id}>
              <td>{ar ? route.nameAr : route.nameEn}</td>
              <td>{aed(route.seatPriceAed, locale)}</td>
              <td>{aed(route.monthlyPriceAed, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>{ar ? "الإلغاء قبل أكثر من ساعتين من بداية الوردية يعيد الأجرة التجريبية. داخل الساعتين يُحرَّر المقعد بلا استرداد." : "Cancel more than two hours before the shift and the demo fare is refunded. Inside two hours the seat is released with no refund."}</p>
      <p className="muted">{ar ? "بطاقة العرض 4242 4242 4242 4242. لا يُحفظ رقم البطاقة كاملًا." : "Demo card 4242 4242 4242 4242. The full card number is not stored."}</p>
    </article>
  );
}

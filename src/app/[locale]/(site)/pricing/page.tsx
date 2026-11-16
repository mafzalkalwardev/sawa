import { pageMeta } from "@/lib/seo";
import { prisma } from "@/lib/db";
import { aed, aedExact } from "@/lib/time";
import { DARB_AED, quoteToll, SALIK_OFFPEAK_AED, SALIK_PEAK_AED } from "@/lib/tolls";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return pageMeta(locale, "pricing", locale === "ar" ? "أسعار العرض" : "Demo prices", locale === "ar" ? "أسعار مقاعد سوى التجريبية وقواعد الإلغاء." : "Sawa demo seat prices and the cancellation rule.");
}

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const routes = await prisma.route.findMany({ orderBy: { seatPriceAed: "asc" }, include: { stops: { orderBy: { sequence: "asc" } } } });
  const ar = locale === "ar";
  return (
    <article className="section">
      <h1>{ar ? "سعر المقعد ظاهر قبل التأكيد." : "The seat price is shown before you confirm."}</h1>
      <p className="lead">{ar ? "المجموعات على فيسبوك وواتساب تجمع الراكب والسائق على نفس الممر. هنا المقعد المشترك أقل بـ 250 درهمًا من حجز المركبة المرخّصة وحدها. لا عرض لمقاعد على سيارة خاصة بلا ترخيص." : "Facebook and WhatsApp groups match a rider to a driver on the same corridor. Here a shared seat is AED 250 less than booking the licensed vehicle alone. Unlicensed private cars are not offered."}</p>
      <table>
        <thead>
          <tr><th>{ar ? "الممر" : "Corridor"}</th><th>{ar ? "مشترك" : "Shared"}</th><th>{ar ? "المركبة وحدها" : "Vehicle alone"}</th><th>{ar ? "شهري مشترك" : "Monthly shared"}</th></tr>
        </thead>
        <tbody>
          {routes.map((route) => (
            <tr key={route.id}>
              <td>{ar ? route.nameAr : route.nameEn}</td>
              <td>{aed(route.seatPriceAed, locale)}</td>
              <td>{aed(route.privatePriceAed, locale)}</td>
              <td>{aed(route.monthlyPriceAed, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>{ar ? "سالك ودرب" : "Salik and Darb"}</h2>
      <p>{ar ? `سالك ${aedExact(SALIK_PEAK_AED, locale)} في الذروة من الاثنين إلى السبت، 6:00–10:00 و16:00–20:00. خارج الذروة والأحد ${aedExact(SALIK_OFFPEAK_AED, locale)}. مجانًا 1:00–6:00. زوج الممزر وزوج الصفا يُحسبان مرة إذا عُبرا خلال ساعة في الاتجاه نفسه. درب ${aed(DARB_AED, locale)} للعبور. غنتوت طوال اليوم، وجسور أبوظبي 7:00–9:00 و15:00–19:00 من الاثنين إلى السبت.` : `Salik is ${aedExact(SALIK_PEAK_AED, locale)} at peak, Monday to Saturday, 06:00–10:00 and 16:00–20:00. Off-peak and Sunday are ${aedExact(SALIK_OFFPEAK_AED, locale)}. Free from 01:00 to 06:00. The Al Mamzar pair and the Al Safa pair are charged once when both gates are crossed within an hour in the same direction. Darb is ${aed(DARB_AED, locale)} a crossing. Ghantoot charges all day. The Abu Dhabi bridges charge 07:00–09:00 and 15:00–19:00, Monday to Saturday.`}</p>
      <table>
        <thead>
          <tr><th>{ar ? "الممر صباح الاثنين" : "Monday morning, full corridor"}</th><th>{ar ? "البوابات" : "Gates"}</th><th>{ar ? "على المركبة" : "On the vehicle"}</th><th>{ar ? "حصة المقعد" : "Seat share"}</th></tr>
        </thead>
        <tbody>
          {routes.map((route) => {
            const quote = quoteToll({
              routeSlug: route.slug,
              stops: route.stops,
              pickupSlug: route.stops[0]?.slug ?? "",
              dropSlug: route.stops.at(-1)?.slug ?? "",
              serviceDate: "2026-11-16",
              windowLabel: "7:00–8:10",
              rideMode: "shared",
            });
            return (
              <tr key={route.id}>
                <td>{ar ? route.nameAr : route.nameEn}</td>
                <td>{quote.lines.map((line) => ar ? line.nameAr : line.nameEn).join(", ") || (ar ? "لا يوجد" : "None")}</td>
                <td>{aedExact(quote.vehicleAed, locale)}</td>
                <td>{aedExact(quote.riderAed, locale)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p>{ar ? "الإلغاء قبل أكثر من ساعتين من بداية الوردية يعيد الأجرة التجريبية. داخل الساعتين يُحرَّر المقعد بلا استرداد." : "Cancel more than two hours before the shift and the demo fare is refunded. Inside two hours the seat is released with no refund."}</p>
      <p className="muted">{ar ? "بطاقة العرض 4242 4242 4242 4242. لا يُحفظ رقم البطاقة كاملًا." : "Demo card 4242 4242 4242 4242. The full card number is not stored."}</p>
    </article>
  );
}

import { pageMeta } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return pageMeta(locale, "terms", locale === "ar" ? "الشروط" : "Terms", locale === "ar" ? "شروط استخدام عرض سوى." : "Terms for the Sawa demonstration.");
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const ar = locale === "ar";
  return (
    <article className="section">
      <h1>{ar ? "الشروط" : "Terms"}</h1>
      <p>{ar ? "باستخدام هذا العرض فأنت تجرب برنامجًا. سوى لا تنقل ركابًا بأجر وليست مشغّل نقل مرخّصًا بمجرد تشغيل هذا المستودع." : "By using this demo you are trying software. Sawa does not carry paying passengers, and running this repository does not make it a licensed transport operator."}</p>
      <h2>{ar ? "الخدمة" : "The service"}</h2>
      <p>{ar ? "الحجز لمقعد على مركبة مشغّل مرخّص في بيانات العرض. لا يجوز استخدام الشاشات لترتيب أجرة على سيارة خاصة." : "A booking is for a seat on a licensed operator’s vehicle in the demo data. The screens must not be used to arrange a fare in a private car."}</p>
      <h2>{ar ? "الدفع والإلغاء" : "Payment and cancellation"}</h2>
      <p>{ar ? "الدفع في العرض يقبل بطاقة الاختبار فقط. الإلغاء قبل أكثر من ساعتين من الوردية يعيد المبلغ التجريبي. داخل الساعتين لا استرداد. أجور النقل خدمة خارج التطبيق، وليست شراءً داخل المتجر." : "Demo payment accepts the test card only. Cancellation more than two hours before the shift refunds the demo amount. Inside two hours there is no refund. Transport fares are a real-world service, not an in-app purchase."}</p>
      <h2>{ar ? "الحساب" : "The account"}</h2>
      <p>{ar ? "يمكن حذف حساب الراكب من الإعدادات. حساب السائق يعلّقه الموظفون." : "A rider account can be deleted from settings. Staff suspend a driver account."}</p>
      <h2>{ar ? "ليس استشارة" : "Not advice"}</h2>
      <p>{ar ? "النصوص التنظيمية في الموقع ملخص تخطيطي من بحث 10 نوفمبر 2026، وليست رأيًا قانونيًا." : "Regulatory wording on the site is a planning summary from research dated 10 November 2026. It is not legal advice."}</p>
    </article>
  );
}

import { pageMeta } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return pageMeta(locale, "privacy", locale === "ar" ? "الخصوصية" : "Privacy", locale === "ar" ? "ما الذي تجمعه سوى في هذا العرض وكيف يُحذف الحساب." : "What this Sawa demo collects and how to delete an account.");
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const ar = locale === "ar";
  return (
    <article className="section">
      <h1>{ar ? "سياسة الخصوصية" : "Privacy policy"}</h1>
      <p>{ar ? "هذه السياسة تخص برنامج العرض المحلي. قبل أي نشر حقيقي يجب مراجعتها مع مستشار وفق مرسوم حماية البيانات الشخصية في الإمارات." : "This policy covers the local demonstration. Before any real launch it must be reviewed with counsel against the UAE Personal Data Protection Law."}</p>
      <h2>{ar ? "ماذا نجمع" : "What we collect"}</h2>
      <ul>
        <li>{ar ? "الاسم ورقم الجوال واللغة وجهة اتصال للطوارئ." : "Name, mobile number, language, and an emergency contact."}</li>
        <li>{ar ? "مواقع المواقف المحفوظة، وحجوزات المقاعد، ورمز الصعود." : "Saved stop locations, seat bookings, and the boarding PIN."}</li>
        <li>{ar ? "للسائقين: صور الهوية والرخصة والتصريح والتأمين والمركبة، وموقع أثناء الوردية." : "For drivers: images of identity, licence, permit, insurance, and the vehicle, plus location during a shift."}</li>
        <li>{ar ? "للدفع التجريبي: آخر أربعة أرقام فقط ومرجع وهمي. لا يُحفظ رقم البطاقة كاملًا." : "For demo payment: last four digits and a fake reference only. The full card number is not stored."}</li>
      </ul>
      <h2>{ar ? "لماذا" : "Why"}</h2>
      <p>{ar ? "لتشغيل الحجز والتعيين والتتبع أثناء الرحلة والدعم والفواتير التجريبية." : "To run booking, assignment, on-trip tracking, support, and demo billing."}</p>
      <h2>{ar ? "المشاركة" : "Sharing"}</h2>
      <p>{ar ? "الموظفون المصرّح لهم يرون السجلات. رابط المشاركة يُظهر تقدم الرحلة لمن ترسله إليه. لا نبيع البيانات." : "Authorised staff see the records. A share link shows trip progress to the person you send it to. We do not sell data."}</p>
      <h2>{ar ? "الحذف" : "Deletion"}</h2>
      <p>{ar ? "من حساب الراكب يمكن حذف الحساب داخل التطبيق. الاسم والهاتف يُستبدلان، وتبقى قيود الفواتير بلا بيانات تعريف." : "A rider can delete the account in the app. Name and phone are replaced. Invoice rows remain without the identifying profile."}</p>
      <h2>{ar ? "الموقع في الخلفية" : "Background location"}</h2>
      <p>{ar ? "يُطلب من السائق أثناء الوردية فقط، ويتوقف عند إنهائها. لا يُستخدم للإعلانات." : "It is requested from a driver only during a shift and stops when the shift ends. It is not used for ads."}</p>
    </article>
  );
}

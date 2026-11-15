import { Notice } from "@/components/notice";
import { pageMeta } from "@/lib/seo";
import { contactMessage } from "@/server/actions/rider";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return pageMeta(locale, "contact", locale === "ar" ? "تواصل" : "Contact", locale === "ar" ? "أرسل رسالة إلى عمليات سوى." : "Send a message to Sawa operations.");
}

export default async function ContactPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const ar = locale === "ar";
  return (
    <article className="section">
      <h1>{ar ? "اكتب للعمليات." : "Write to operations."}</h1>
      <p>{ar ? "الرسالة تفتح تذكرة في لوحة الموظفين. هذا ليس خط طوارئ." : "The message opens a ticket on the staff board. This is not an emergency line."}</p>
      <Notice locale={locale} code={query.error} ok={query.ok} />
      <form className="card stack" action={contactMessage}>
        <input type="hidden" name="locale" value={locale} />
        <label>{ar ? "الاسم" : "Name"}<input name="name" required /></label>
        <label>{ar ? "البريد" : "Email"}<input name="email" type="email" /></label>
        <label>{ar ? "الجهة" : "Organisation"}<input name="organisation" /></label>
        <label>{ar ? "الرسالة" : "Message"}<textarea name="message" required /></label>
        <button className="btn" type="submit">{ar ? "إرسال" : "Send"}</button>
      </form>
    </article>
  );
}

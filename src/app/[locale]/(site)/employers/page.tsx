import Link from "next/link";
import { pageMeta } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return pageMeta(locale, "employers", locale === "ar" ? "للشركات والجامعات" : "For employers and campuses", locale === "ar" ? "حساب شركة يجمّع مقاعد الموظفين على مركبة مرخّصة." : "A company account pools employee seats on a licensed vehicle.");
}

export default async function EmployersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const ar = locale === "ar";
  return (
    <article className="section">
      <h1>{ar ? "ابدأ بمجموعة عمل، لا بإعلان للغرباء." : "Start with a workplace pool, not a public classified."}</h1>
      <p className="lead">{ar ? "الموارد أو الخدمات تسجّل الموظفين. الفاتورة يمكن أن تذهب للشركة. المركبة تبقى لدى مشغّل مرخّص." : "HR or facilities enroll people. The invoice can go to the company. The vehicle stays with a licensed operator."}</p>
      <div className="grid">
        <section className="card"><h2>{ar ? "ما يراه الموظف" : "What an employee sees"}</h2><p>{ar ? "نفس تطبيق الراكب: ممر، مقعد، رمز صعود." : "The same rider app: a corridor, a seat, a boarding PIN."}</p></section>
        <section className="card"><h2>{ar ? "ما تراه الشركة" : "What the company sees"}</h2><p>{ar ? "في هذا الإصدار، حساب الشركة شاشة داخل لوحة العمليات: الركاب والفواتير." : "In this version the company account is a view inside operations: riders and invoices."}</p></section>
        <section className="card"><h2>{ar ? "ما لا نبيعه" : "What we will not sell"}</h2><p>{ar ? "مطابقة سيارات الموظفين الخاصة مقابل أجر." : "Matching employees’ private cars for a fare."}</p></section>
      </div>
      <p><Link className="btn" href={`/${locale}/contact`}>{ar ? "كلّم العمليات" : "Talk to operations"}</Link></p>
    </article>
  );
}

import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function EmployersOps({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireStaff(locale);
  const accounts = await prisma.corporateAccount.findMany({ include: { customers: true, invoices: true } });
  const ar = locale === "ar";
  return (
    <>
      <h1>{ar ? "حسابات الشركات" : "Employer accounts"}</h1>
      {accounts.map((account) => (
        <section key={account.id} className="card">
          <h2>{account.name}</h2>
          <p>{account.billingEmail} · {account.status}</p>
          <p>{ar ? "الركاب" : "Riders"}: {account.customers.map((customer) => customer.fullName).join(", ") || "—"}</p>
          <p>{ar ? "فواتير" : "Invoices"}: {account.invoices.length}</p>
        </section>
      ))}
    </>
  );
}

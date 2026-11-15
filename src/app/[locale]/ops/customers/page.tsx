import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function CustomersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  await requireStaff(locale);
  const q = query.q?.trim() || "";
  const customers = await prisma.customer.findMany({
    where: q ? { OR: [{ fullName: { contains: q } }, { phone: { contains: q } }], status: { not: "deleted" } } : { status: { not: "deleted" } },
    include: { corporate: true },
    orderBy: { fullName: "asc" },
  });
  const ar = locale === "ar";
  return (
    <>
      <h1>{ar ? "الركاب" : "Riders"}</h1>
      <form className="row"><input name="q" defaultValue={q} /><button className="btn small">{ar ? "بحث" : "Search"}</button></form>
      <p><Link className="btn" href={`/${locale}/ops/customers/new`}>{ar ? "تسجيل راكب" : "Enroll rider"}</Link></p>
      <table>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer.id}>
              <td><Link href={`/${locale}/ops/customers/${customer.id}`}>{customer.fullName}</Link></td>
              <td>{customer.phone}</td>
              <td>{customer.corporate?.name || customer.payerType}</td>
              <td>{customer.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

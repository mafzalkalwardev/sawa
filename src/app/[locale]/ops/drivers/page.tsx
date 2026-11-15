import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function DriversPage({
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
  const drivers = await prisma.driver.findMany({
    where: q ? { OR: [{ fullName: { contains: q } }, { phone: { contains: q } }] } : undefined,
    include: { operator: true },
    orderBy: { fullName: "asc" },
  });
  const ar = locale === "ar";
  return (
    <>
      <h1>{ar ? "السائقون" : "Drivers"}</h1>
      <form className="row"><input name="q" defaultValue={q} placeholder={ar ? "بحث" : "Search"} /><button className="btn small">{ar ? "بحث" : "Search"}</button></form>
      <p><Link className="btn" href={`/${locale}/ops/drivers/new`}>{ar ? "تسجيل سائق" : "Enroll driver"}</Link></p>
      <table>
        <tbody>
          {drivers.map((driver) => (
            <tr key={driver.id}>
              <td><Link href={`/${locale}/ops/drivers/${driver.id}`}>{driver.fullName}</Link></td>
              <td>{driver.phone}</td>
              <td>{driver.operator.name}</td>
              <td><span className={`tag ${driver.status === "approved" ? "good" : "warn"}`}>{driver.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function ReportsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const staff = await requireStaff(locale);
  const [bookings, invoices, drivers, overrides, assignments, subs] = await Promise.all([
    prisma.booking.findMany(),
    prisma.invoice.findMany({ where: { status: "paid" } }),
    prisma.driver.findMany(),
    prisma.assignment.count({ where: { source: "override" } }),
    prisma.assignment.count(),
    prisma.commuteSubscription.groupBy({ by: ["status"], _count: true }),
  ]);
  const revenue = invoices.reduce((sum, invoice) => sum + invoice.amountAed, 0);
  const byRoute = new Map<string, number>();
  for (const booking of bookings) byRoute.set(booking.routeId, (byRoute.get(booking.routeId) || 0) + 1);
  const routes = await prisma.route.findMany();
  const approved = drivers.filter((driver) => driver.status === "approved").length;
  const ar = locale === "ar";
  return (
    <>
      <h1>{ar ? "التقارير" : "Reports"}</h1>
      <div className="grid">
        <article className="card"><h2>{revenue}</h2><p>AED {ar ? "مدفوع" : "paid"}</p></article>
        <article className="card"><h2>{approved}/{drivers.length}</h2><p>{ar ? "سائقون معتمدون" : "Approved drivers"}</p></article>
        <article className="card"><h2>{assignments ? Math.round((overrides / assignments) * 100) : 0}%</h2><p>{ar ? "نسبة التجاوز" : "Override rate"}</p></article>
      </div>
      <h2>{ar ? "الطلب حسب الممر" : "Demand by corridor"}</h2>
      <ul>{routes.map((route) => <li key={route.id}>{ar ? route.nameAr : route.nameEn}: {byRoute.get(route.id) || 0}</li>)}</ul>
      <h2>{ar ? "حالة الاشتراك" : "Pass status"}</h2>
      <ul>{subs.map((row) => <li key={row.status}>{row.status}: {row._count}</li>)}</ul>
      {staff.role === "readonly" || staff.role === "support" || staff.role === "onboarding" ? null : (
        <p><a className="btn" href="/api/ops/export?kind=trips">{ar ? "تنزيل CSV" : "Download CSV"}</a></p>
      )}
    </>
  );
}

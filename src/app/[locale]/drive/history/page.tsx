import { requireDriver } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function DriverHistory({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const driver = await requireDriver(locale);
  const runs = await prisma.run.findMany({
    where: { driverId: driver.id },
    include: { route: true, bookings: true },
    orderBy: { serviceDate: "desc" },
    take: 20,
  });
  const ar = locale === "ar";
  const earned = runs.filter((run) => run.status === "completed").reduce((sum, run) => sum + run.bookings.reduce((inner, booking) => inner + booking.priceAed, 0), 0);
  return (
    <>
      <h1>{ar ? "السجل" : "History"}</h1>
      <p>{ar ? `إيراد المقاعد المكتملة ${earned} د.إ. المستحقات تُدار في لوحة العمليات.` : `Completed seat revenue AED ${earned}. Payouts are managed in operations.`}</p>
      {runs.map((run) => (
        <article key={run.id} className="card">
          <h2>{ar ? run.route.nameAr : run.route.nameEn}</h2>
          <p>{run.serviceDate} · {run.shift} · {run.status}</p>
        </article>
      ))}
    </>
  );
}

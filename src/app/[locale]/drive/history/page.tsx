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
  const earned = runs.filter((run) => run.status === "completed").reduce((sum, run) => sum + run.bookings.filter((booking) => booking.status !== "cancelled").reduce((inner, booking) => inner + booking.priceAed, 0), 0);
  const words = (status: string) => status === "completed" ? (ar ? "انتهت" : "Finished") : status === "live" ? (ar ? "على الطريق" : "On the road") : status === "cancelled" ? (ar ? "أُلغيت" : "Cancelled") : (ar ? "قادمة" : "Coming up");
  return (
    <>
      <h1>{ar ? "رحلاتك" : "Your rides"}</h1>
      <p className="price">{earned} AED</p>
      <p className="muted">{ar ? "هذا ما اتفق عليه الركاب في الرحلات المنتهية." : "This is what passengers agreed on finished rides."}</p>
      {runs.length === 0 ? <p className="card">{ar ? "لا توجد رحلة بعد." : "No ride yet."}</p> : null}
      {runs.map((run) => {
        const people = run.bookings.filter((booking) => booking.status !== "cancelled");
        const fare = people.reduce((sum, booking) => sum + booking.priceAed, 0);
        return (
          <article key={run.id} className="card">
            <h2>{ar ? run.route.nameAr : run.route.nameEn}</h2>
            <p>{run.serviceDate} · {run.shift === "evening" ? (ar ? "مساء" : "Evening") : (ar ? "صباح" : "Morning")} · {words(run.status)}</p>
            <p>{people.length} {ar ? "ركاب" : "passengers"} · {fare} AED</p>
          </article>
        );
      })}
    </>
  );
}

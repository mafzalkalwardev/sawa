import { Notice } from "@/components/notice";
import { RateForm } from "@/components/rate-form";
import { requireRider } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function HistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const customer = await requireRider(locale);
  const bookings = await prisma.booking.findMany({
    where: { customerId: customer.id },
    orderBy: { serviceDate: "desc" },
    include: { run: { include: { driver: true } } },
    take: 20,
  });
  const routes = await prisma.route.findMany();
  const byId = new Map(routes.map((route) => [route.id, route]));
  const ar = locale === "ar";
  const words = (status: string) => status === "completed" ? (ar ? "وصلت" : "Arrived") : status === "boarded" ? (ar ? "في المركبة" : "On the van") : status === "cancelled" ? (ar ? "أُلغيت" : "Cancelled") : status === "no_show" ? (ar ? "لم تحضر" : "Didn't show") : (ar ? "مؤكدة" : "Confirmed");
  return (
    <>
      <h1>{ar ? "رحلاتك" : "Your rides"}</h1>
      <Notice locale={locale} ok={query.ok} code={query.error} />
      {bookings.length === 0 ? <p className="card">{ar ? "لا توجد رحلة بعد." : "No ride yet."}</p> : null}
      <div className="stack">
        {bookings.map((booking) => {
          const route = byId.get(booking.routeId);
          return (
            <article key={booking.id} className="card">
              <h2>{route ? (ar ? route.nameAr : route.nameEn) : ""}</h2>
              <p>{booking.serviceDate} · {booking.shift === "evening" ? (ar ? "مساء" : "Evening") : (ar ? "صباح" : "Morning")} · {words(booking.status)} · {booking.priceAed} AED</p>
              {booking.run?.driver ? <p>{booking.run.driver.displayName}</p> : null}
              {booking.status === "completed" && booking.rating == null ? <RateForm locale={locale} bookingId={booking.id} /> : null}
              {booking.rating ? <p>{ar ? `تقييمك ${booking.rating} من 5` : `You gave ${booking.rating} out of 5`}</p> : null}
            </article>
          );
        })}
      </div>
    </>
  );
}

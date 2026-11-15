import { Notice } from "@/components/notice";
import { t } from "@/i18n/copy";
import { requireRider } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rateTrip } from "@/server/actions/rider";

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
  const m = t(locale);
  const ar = locale === "ar";
  return (
    <>
      <h1>{m.history}</h1>
      <Notice locale={locale} ok={query.ok} code={query.error} />
      <div className="stack">
        {bookings.map((booking) => {
          const route = byId.get(booking.routeId);
          return (
            <article key={booking.id} className="card">
              <h2>{route ? (ar ? route.nameAr : route.nameEn) : booking.routeId}</h2>
              <p>{booking.serviceDate} · {booking.shift} · {booking.status}</p>
              {booking.status === "completed" && booking.rating == null ? (
                <form action={rateTrip}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="bookingId" value={booking.id} />
                  <label>{ar ? "التقييم" : "Rating"}
                    <select name="rating" defaultValue="5">
                      {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
                  <label>{ar ? "تعليق" : "Comment"}<input name="comment" /></label>
                  <button className="btn small" type="submit">{m.save}</button>
                </form>
              ) : null}
              {booking.rating ? <p>{booking.rating}/5</p> : null}
            </article>
          );
        })}
      </div>
    </>
  );
}

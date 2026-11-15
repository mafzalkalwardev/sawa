import Link from "next/link";
import { Notice } from "@/components/notice";
import { t } from "@/i18n/copy";
import { requireRider } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { aed, dubaiToday, weekdayName } from "@/lib/time";
import { ensureServiceDay } from "@/server/service-day";

export default async function RideHome({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const customer = await requireRider(locale);
  await ensureServiceDay();
  const today = dubaiToday();
  const m = t(locale);
  const ar = locale === "ar";
  const booking = await prisma.booking.findFirst({
    where: { customerId: customer.id, serviceDate: { gte: today }, status: { in: ["confirmed", "boarded", "pending_payment"] } },
    orderBy: { serviceDate: "asc" },
    include: { run: { include: { driver: true, vehicle: true } } },
  });
  const routes = await prisma.route.findMany({ where: { active: true }, orderBy: { nameEn: "asc" } });
  const pickup = booking ? await prisma.stop.findUnique({ where: { id: booking.pickupStopId } }) : null;
  return (
    <>
      <h1>{customer.fullName ? (ar ? `مرحبًا ${customer.fullName.split(" ")[0]}` : `Hello ${customer.fullName.split(" ")[0]}`) : m.home}</h1>
      <p className="muted">{weekdayName(today, locale)}</p>
      <Notice locale={locale} ok={query.ok} code={query.error} />
      {booking ? (
        <section className="card">
          <p className="eyebrow">{m.upcoming}</p>
          <h2>{pickup ? (ar ? pickup.nameAr : pickup.nameEn) : booking.windowLabel}</h2>
          <p>{booking.windowLabel} · {booking.serviceDate}</p>
          {booking.pin ? <p className="pin" aria-label={m.pin}>{booking.pin}</p> : null}
          {booking.run?.vehicle ? <p>{booking.run.vehicle.plate} · {booking.run.driver.displayName}</p> : <p>{ar ? "بانتظار مركبة مرخّصة." : "Waiting for a licensed vehicle."}</p>}
          <Link className="btn" href={`/${locale}/ride/trip/${booking.id}`}>{ar ? "الرحلة" : "Open trip"}</Link>
        </section>
      ) : (
        <section className="card">
          <h2>{ar ? "لا يوجد مقعد قادم" : "No upcoming seat"}</h2>
          <Link className="btn" href={`/${locale}/ride/book`}>{m.bookSeat}</Link>
        </section>
      )}
      <section className="stack">
        {routes.map((route) => (
          <article key={route.id} className="card">
            <h2>{ar ? route.nameAr : route.nameEn}</h2>
            <p>{ar ? route.morningTimetableAr : route.morningTimetableEn}</p>
            <p className="muted">{ar ? route.eveningTimetableAr : route.eveningTimetableEn}</p>
            <p>{aed(route.seatPriceAed, locale)}</p>
          </article>
        ))}
      </section>
    </>
  );
}

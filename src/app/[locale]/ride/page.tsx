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
  const upcoming = await prisma.booking.findMany({
    where: { customerId: customer.id, serviceDate: { gte: today }, status: { in: ["confirmed", "boarded", "pending_payment"] } },
    orderBy: { serviceDate: "asc" },
    include: { run: { include: { driver: true, vehicle: true } } },
  });
  const booking = upcoming.find((item) => item.runId) ?? upcoming[0];
  const routes = await prisma.route.findMany({ where: { active: true }, orderBy: { nameEn: "asc" } });
  const pickup = booking ? await prisma.stop.findUnique({ where: { id: booking.pickupStopId } }) : null;
  const drivers = await prisma.driver.findMany({
    where: { status: "approved", onShift: true },
    include: {
      vehicles: true,
      runs: {
        where: { serviceDate: today, shift: "morning", status: { not: "cancelled" } },
        include: { route: true, bookings: { where: { status: { not: "cancelled" } }, include: { customer: true } } },
      },
    },
    orderBy: { displayName: "asc" },
  });
  const seats = drivers.flatMap((driver) => driver.runs.flatMap((run) => run.bookings.map((item) => ({ item, driver, run }))));
  const stops = await prisma.stop.findMany();
  const stopName = (id: string) => {
    const stop = stops.find((item) => item.id === id);
    return stop ? (ar ? stop.nameAr : stop.nameEn) : "";
  };
  const first = customer.fullName.split(" ")[0];
  return (
    <>
      <div className="hello">
        <h1>{first ? (ar ? `مرحبًا ${first}` : `Hello ${first}`) : m.home}</h1>
        <p className="muted">{weekdayName(today, locale)}</p>
      </div>
      <Notice locale={locale} ok={query.ok} code={query.error} />
      {booking ? (
        <section className="ticket">
          <p className="eyebrow">{m.upcoming}</p>
          <h2>{pickup ? (ar ? pickup.nameAr : pickup.nameEn) : booking.windowLabel}</h2>
          <p>{booking.windowLabel} · {booking.serviceDate}</p>
          {booking.pin ? <p className="pin" aria-label={m.pin}>{booking.pin}</p> : null}
          <p>{booking.run?.vehicle ? `${booking.run.vehicle.plate} · ${booking.run.driver.displayName}` : (ar ? "بانتظار مركبة مرخّصة." : "Waiting for a licensed vehicle.")}</p>
          <Link className="btn" href={`/${locale}/ride/trip/${booking.id}`}>{ar ? "الرحلة" : "Open trip"}</Link>
          {booking.run ? <Link className="btn ghost" href={`/${locale}/ride/chat/${booking.id}`}>{m.chat}</Link> : null}
        </section>
      ) : (
        <Link className="choice" href={`/${locale}/ride/book`}>
          <span><strong>{ar ? "اطلب رحلة" : "Ask for a ride"}</strong><span>{ar ? "الطريق، الوقت، وهل تشارك المركبة" : "The road, the time, and whether you share the van"}</span></span>
          <strong>{ar ? "←" : "→"}</strong>
        </Link>
      )}
      <section className="stack" style={{ marginTop: 18 }}>
        <h2>{ar ? "السائقون على الطريق اليوم" : "Drivers out today"}</h2>
        {drivers.map((driver) => {
          const run = driver.runs[0];
          const vehicle = driver.vehicles.find((item) => item.id === driver.defaultVehicleId);
          return (
            <article key={driver.id} className="card">
              <p className="eyebrow">{run ? (ar ? run.route.nameAr : run.route.nameEn) : driver.baseAddress}</p>
              <h2>{driver.displayName}</h2>
              <p>{vehicle?.plate} · {vehicle?.color} {vehicle?.model}</p>
              <p className="muted">{ar ? "على الطريق الآن" : "On the road now"}</p>
              {run?.bookings.map((item) => (
                <p key={item.id}>{item.customer.fullName} · {stopName(item.pickupStopId)} → {stopName(item.dropStopId)}{item.customerId === customer.id ? ` · ${ar ? "أنت" : "You"}` : ""}</p>
              ))}
            </article>
          );
        })}
        <p className="muted">{ar ? `${seats.length} رحلات محجوزة اليوم` : `${seats.length} rides booked today`}</p>
      </section>
      <section style={{ marginTop: 8 }}>
        {routes.map((route) => (
          <Link key={route.id} className="corridor" href={`/${locale}/ride/book`}>
            <span className="corridor-title">
              <strong>{ar ? route.nameAr : route.nameEn}</strong>
              <strong>{aed(route.seatPriceAed, locale)} <span className="muted">{ar ? "+ سالك" : "+ Salik"}</span></strong>
            </span>
          </Link>
        ))}
      </section>
    </>
  );
}

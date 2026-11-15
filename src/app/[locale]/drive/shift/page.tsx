import { LocationPublisher } from "@/components/location-publisher";
import { Notice } from "@/components/notice";
import { t } from "@/i18n/copy";
import { requireDriver } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dubaiToday } from "@/lib/time";
import { arriveStop, boardWithPin, completeRun, endShift, markNoShow, reportDelay, reportIncident, simulateLocation } from "@/server/actions/driver";

export default async function ShiftPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const driver = await requireDriver(locale);
  const run = await prisma.run.findFirst({
    where: { driverId: driver.id, serviceDate: dubaiToday(), status: { in: ["scheduled", "live"] } },
    include: {
      route: true,
      vehicle: true,
      bookings: { include: { customer: true } },
      stopEvents: { orderBy: { sequence: "asc" } },
    },
  });
  const stops = run ? await prisma.stop.findMany({ where: { routeId: run.routeId } }) : [];
  const stopName = new Map(stops.map((stop) => [stop.id, stop]));
  const m = t(locale);
  const ar = locale === "ar";
  const nextEvent = run?.stopEvents.find((event) => event.status !== "arrived");
  return (
    <>
      <LocationPublisher enabled={driver.onShift} />
      <h1>{m.today}</h1>
      <Notice locale={locale} ok={query.ok} code={query.error} />
      {!run ? <p>{ar ? "لا توجد رحلة." : "No run."}</p> : (
        <>
          <p>{ar ? run.route.nameAr : run.route.nameEn} · {run.vehicle.plate} · {run.status}</p>
          {nextEvent ? (
            <form action={arriveStop}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="eventId" value={nextEvent.id} />
              <p>{ar ? stopName.get(nextEvent.stopId)?.nameAr : stopName.get(nextEvent.stopId)?.nameEn}</p>
              <button className="btn" type="submit">{m.arrived}</button>
            </form>
          ) : null}
          <form className="row" action={boardWithPin}>
            <input type="hidden" name="locale" value={locale} />
            <label>{m.pin}<input name="pin" inputMode="numeric" required /></label>
            <button className="btn" type="submit">{m.board}</button>
          </form>
          <div className="stack">
            {run.bookings.map((booking) => (
              <article key={booking.id} className="card">
                <h2>{booking.customer.fullName}</h2>
                <p>{booking.status} · {ar ? stopName.get(booking.pickupStopId)?.nameAr : stopName.get(booking.pickupStopId)?.nameEn}</p>
                {booking.status === "confirmed" ? (
                  <form action={markNoShow}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <button className="btn ghost small" type="submit">{m.noShow}</button>
                  </form>
                ) : null}
              </article>
            ))}
          </div>
          <form action={reportDelay} className="stack">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="runId" value={run.id} />
            <label>{m.delay}<input name="note" /></label>
            <button className="btn ghost" type="submit">{m.delay}</button>
          </form>
          <form action={reportIncident} className="stack">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="runId" value={run.id} />
            <label>{m.incident}<textarea name="body" /></label>
            <button className="btn ghost" type="submit">{m.incident}</button>
          </form>
          <form action={simulateLocation}>
            <input type="hidden" name="locale" value={locale} />
            <button className="btn" type="submit" disabled={!driver.onShift}>{m.simulate}</button>
          </form>
          <form action={completeRun}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="runId" value={run.id} />
            <button className="btn ghost" type="submit">{m.complete}</button>
          </form>
        </>
      )}
      <form action={endShift}>
        <input type="hidden" name="locale" value={locale} />
        <button className="btn danger" type="submit">{m.endShift}</button>
      </form>
    </>
  );
}

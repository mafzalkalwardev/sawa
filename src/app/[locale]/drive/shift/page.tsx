import { LocationPublisher } from "@/components/location-publisher";
import { Notice } from "@/components/notice";
import { t } from "@/i18n/copy";
import { requireDriver } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dubaiToday } from "@/lib/time";
import { arriveStop, boardWithPin, completeRun, endShift, markNoShow, reportDelay, reportIncident } from "@/server/actions/driver";
import { awayFromRoadKm, drive } from "@/server/routing";

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
  const road = stops.length ? await drive([...stops].sort((a, b) => a.sequence - b.sequence)) : null;
  const ping = await prisma.locationPing.findFirst({ where: { driverId: driver.id }, orderBy: { createdAt: "desc" } });
  const awayKm = road && ping ? awayFromRoadKm(ping, road.path) : null;
  return (
    <>
      <LocationPublisher enabled={driver.onShift} />
      <h1>{ar ? "مركبة اليوم" : "Today's van"}</h1>
      <Notice locale={locale} ok={query.ok} code={query.error} />
      {!run ? <p className="card">{ar ? "لا توجد رحلة مؤكدة لليوم." : "No ride is confirmed for today."}</p> : (
        <>
          <p>{ar ? run.route.nameAr : run.route.nameEn} · {run.vehicle.plate}</p>
          {awayKm != null ? <p className="alert">{ar ? "الهاتف ليس على هذا الطريق، لذلك تبقى المركبة على المسار." : "The phone is not on this road, so the van stays on the route."}</p> : null}
          {nextEvent ? (
            <form action={arriveStop}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="eventId" value={nextEvent.id} />
              <p>{ar ? "المحطة التالية" : "Next stop"}: {ar ? stopName.get(nextEvent.stopId)?.nameAr : stopName.get(nextEvent.stopId)?.nameEn}</p>
              <button className="btn" type="submit">{ar ? "أنا عند هذا الموقف" : "I'm at this stop"}</button>
            </form>
          ) : null}
          <form className="stack" action={boardWithPin}>
            <input type="hidden" name="locale" value={locale} />
            <label>{ar ? "رقم الراكب" : "Passenger's pickup number"}<input name="pin" inputMode="numeric" placeholder="0000" required /></label>
            <button className="btn" type="submit">{ar ? "هم في المركبة" : "They're on"}</button>
          </form>
          <div className="stack">
            {run.bookings.filter((booking) => booking.status !== "cancelled").map((booking) => (
              <article key={booking.id} className="card">
                <h2>{booking.customer.fullName}</h2>
                <p>{booking.status === "boarded" ? (ar ? "في المركبة" : "On the van") : booking.status === "no_show" ? (ar ? "لم يحضر" : "Didn't show") : booking.status === "completed" ? (ar ? "نزل" : "Dropped off") : (ar ? "ينتظر عند الموقف" : "Waiting at the stop")} · {ar ? stopName.get(booking.pickupStopId)?.nameAr : stopName.get(booking.pickupStopId)?.nameEn}</p>
                {booking.status === "confirmed" ? (
                  <form action={markNoShow}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <button className="btn ghost" type="submit">{ar ? "لم يحضر" : "They didn't show"}</button>
                  </form>
                ) : null}
              </article>
            ))}
          </div>
          <form action={reportDelay} className="stack">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="runId" value={run.id} />
            <label>{ar ? "متأخرون" : "Running late"}<input name="note" placeholder={ar ? "كم دقيقة؟" : "How many minutes?"} /></label>
            <button className="btn ghost" type="submit">{ar ? "أخبر الركاب" : "Tell the passengers"}</button>
          </form>
          <form action={reportIncident} className="stack">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="runId" value={run.id} />
            <label>{ar ? "حدث شيء" : "Something went wrong"}<textarea name="body" /></label>
            <button className="btn ghost" type="submit">{ar ? "أبلغ العمليات" : "Tell operations"}</button>
          </form>
          <form action={completeRun}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="runId" value={run.id} />
            <button className="btn ghost" type="submit">{ar ? "نزل الجميع" : "Everyone is dropped off"}</button>
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

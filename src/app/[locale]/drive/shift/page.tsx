import Link from "next/link";
import { LocationPublisher } from "@/components/location-publisher";
import { Notice } from "@/components/notice";
import { t } from "@/i18n/copy";
import { requireDriver } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { compareRuns, dubaiToday, vanTitle } from "@/lib/time";
import { arriveStop, boardWithPin, completeRun, dropPassenger, endShift, markNoShow, reportDelay, reportIncident } from "@/server/actions/driver";
import { awayFromRoadKm, drive, minutesAlong, onRoad } from "@/server/routing";

export default async function ShiftPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ok?: string; error?: string; run?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const driver = await requireDriver(locale);
  const today = dubaiToday();
  const requested = typeof query.run === "string" ? query.run : "";
  const runs = await prisma.run.findMany({
    where: requested
      ? { id: requested, driverId: driver.id, status: { in: ["scheduled", "live"] } }
      : { driverId: driver.id, serviceDate: today, status: { in: ["scheduled", "live"] } },
    include: {
      route: true,
      vehicle: true,
      bookings: { include: { customer: true } },
      stopEvents: { orderBy: { sequence: "asc" } },
    },
  });
  runs.sort(compareRuns);
  const run = runs[0] ?? null;
  const stops = run ? await prisma.stop.findMany({ where: { routeId: run.routeId } }) : [];
  const stopName = new Map(stops.map((stop) => [stop.id, stop]));
  const m = t(locale);
  const ar = locale === "ar";
  const nextEvent = run?.stopEvents.find((event) => event.status !== "arrived");
  const road = stops.length ? await drive([...stops].sort((a, b) => a.sequence - b.sequence)) : null;
  const ping = await prisma.locationPing.findFirst({ where: { driverId: driver.id }, orderBy: { createdAt: "desc" } });
  const awayKm = road && ping ? awayFromRoadKm(ping, road.path) : null;
  const live = driver.liveLat != null && driver.liveLng != null ? { lat: driver.liveLat, lng: driver.liveLng } : null;
  const liveOnRoad = Boolean(road && live && onRoad(live, road.path));
  const nextStopPoint = nextEvent ? stopName.get(nextEvent.stopId) : null;
  const progress = awayKm == null && liveOnRoad && road && live && nextStopPoint ? minutesAlong(road, live, nextStopPoint) : { minutes: null, passed: false };
  return (
    <>
      <LocationPublisher enabled={driver.onShift} />
      <h1>{run ? vanTitle(run.serviceDate, run.shift, today, ar) : (ar ? "مركبة اليوم" : "Today's van")}</h1>
      <Notice locale={locale} ok={query.ok} code={query.error} />
      {!run ? <p className="card">{ar ? "لا توجد رحلة مؤكدة لليوم." : "No ride is confirmed for today."}</p> : (
        <>
          <p>{ar ? run.route.nameAr : run.route.nameEn} · {run.vehicle.plate}</p>
          {awayKm != null ? <p className="alert">{ar ? "الهاتف ليس على هذا الطريق، لذلك لا يُحسب وقت. تبقى المركبة على المسار." : "The phone is not on this road, so there is no minute count. The van stays on the route."}</p> : null}
          {awayKm == null && !live && driver.onShift ? <p className="muted">{ar ? "هذا الهاتف لم يشارك موقعاً بعد." : "This phone has not shared a position yet."}</p> : null}
          {nextEvent ? (
            <form action={arriveStop}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="eventId" value={nextEvent.id} />
              <p>{ar ? "المحطة التالية" : "Next stop"}: {ar ? stopName.get(nextEvent.stopId)?.nameAr : stopName.get(nextEvent.stopId)?.nameEn}</p>
              {progress.minutes != null ? <p>{ar ? `حوالي ${progress.minutes} د على هذا الطريق` : `About ${progress.minutes} min along this road`}</p> : null}
              {progress.passed ? <p className="muted">{ar ? "هذا الموقف خلف المركبة." : "This stop is behind the van."}</p> : null}
              <button className="btn" type="submit">{ar ? "أنا عند هذا الموقف" : "I'm at this stop"}</button>
            </form>
          ) : null}
          <form className="stack" action={boardWithPin}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="runId" value={run.id} />
            <label>{ar ? "رقم الراكب" : "Passenger's pickup number"}<input name="pin" inputMode="numeric" placeholder="0000" required /></label>
            <button className="btn" type="submit">{ar ? "هم في المركبة" : "They're on"}</button>
          </form>
          <div className="stack">
            {run.bookings.filter((booking) => booking.status !== "cancelled").map((booking) => (
              <article key={booking.id} className="card">
                <h2>{booking.customer.fullName}</h2>
                <p>{booking.status === "boarded" ? (ar ? "في المركبة" : "On the van") : booking.status === "no_show" ? (ar ? "لم يحضر" : "Didn't show") : booking.status === "completed" ? (ar ? "نزل" : "Dropped off") : (ar ? "ينتظر عند الموقف" : "Waiting at the stop")} · {ar ? stopName.get(booking.pickupStopId)?.nameAr : stopName.get(booking.pickupStopId)?.nameEn} → {ar ? stopName.get(booking.dropStopId)?.nameAr : stopName.get(booking.dropStopId)?.nameEn}</p>
                <p><Link href={`/${locale}/drive/call/${booking.id}`}>{ar ? "اتصل دون إظهار الرقم" : "Call without showing the number"}</Link></p>
                {booking.status === "confirmed" ? (
                  <form action={markNoShow}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <button className="btn ghost" type="submit">{ar ? "لم يحضر" : "They didn't show"}</button>
                  </form>
                ) : null}
                {booking.status === "boarded" ? (
                  <form action={dropPassenger}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <button className="btn" type="submit">{ar ? "نزل هذا الراكب" : "This passenger is dropped off"}</button>
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

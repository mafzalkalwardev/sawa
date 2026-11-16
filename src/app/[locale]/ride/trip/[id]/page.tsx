import Link from "next/link";
import { notFound } from "next/navigation";
import { LiveTrip } from "@/components/live-trip";
import { Notice } from "@/components/notice";
import { t } from "@/i18n/copy";
import { requireRider } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { cancelBooking, sendSos } from "@/server/actions/rider";
import { LiveRefresh } from "@/components/live-refresh";
import { RateForm } from "@/components/rate-form";
import { awayFromRoadKm, drive, onRoad } from "@/server/routing";

export default async function TripPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { locale, id } = await params;
  const query = await searchParams;
  const customer = await requireRider(locale);
  const booking = await prisma.booking.findFirst({
    where: { id, customerId: customer.id },
    include: { run: { include: { driver: true, vehicle: true, route: { include: { stops: { orderBy: { sequence: "asc" } } } } } } },
  });
  if (!booking) notFound();
  const pickup = await prisma.stop.findUnique({ where: { id: booking.pickupStopId } });
  const drop = await prisma.stop.findUnique({ where: { id: booking.dropStopId } });
  const m = t(locale);
  const ar = locale === "ar";
  const stops = booking.run?.route.stops ?? [];
  const driver = booking.run?.driver;
  const road = stops.length ? await drive(stops) : null;
  const live = driver?.liveLat != null && driver.liveLng != null ? { lat: driver.liveLat, lng: driver.liveLng } : null;
  const base = driver?.baseLat != null && driver.baseLng != null ? { lat: driver.baseLat, lng: driver.baseLng } : null;
  const marker = road && live && onRoad(live, road.path)
    ? live
    : road && base && onRoad(base, road.path)
      ? base
      : stops[0] ? { lat: stops[0].lat, lng: stops[0].lng } : null;
  const ping = driver ? await prisma.locationPing.findFirst({ where: { driverId: driver.id }, orderBy: { createdAt: "desc" } }) : null;
  const awayKm = road && ping ? awayFromRoadKm(ping, road.path) : null;
  const eta = marker && pickup ? (await drive([marker, pickup])).durationMin : null;
  const host = (await headers()).get("x-forwarded-host") || (await headers()).get("host");
  const share = booking.shareToken ? `${process.env.NEXT_PUBLIC_APP_URL || `https://${host}`}/${locale}/share/${booking.shareToken}` : "";
  const state = booking.status === "completed"
    ? (ar ? "وصلت." : "You're there.")
    : booking.status === "boarded"
      ? (ar ? "أنت في المركبة." : "You're on the van.")
      : booking.status === "no_show"
        ? (ar ? "السائق سجّل أنك لم تكن عند الموقف." : "The driver marked that you were not at the stop.")
        : booking.status === "cancelled"
          ? (ar ? "أُلغيت هذه الرحلة." : "This ride was cancelled.")
          : booking.run
            ? (ar ? "المركبة قادمة. أظهر هذا الرقم للسائق." : "The van is coming. Show this number to the driver.")
            : (ar ? "الرحلة مؤكدة. بانتظار مركبة على هذا الطريق." : "The ride is confirmed. Waiting for a van on this road.");
  const points = [
    ...stops.map((stop) => ({ id: stop.id, lat: stop.lat, lng: stop.lng, label: ar ? stop.nameAr : stop.nameEn, kind: "stop" as const })),
    ...(marker && driver ? [{ id: "live", lat: marker.lat, lng: marker.lng, label: driver.displayName, kind: "live" as const }] : []),
  ];
  return (
    <>
      <LiveRefresh />
      <h1>{state}</h1>
      <Notice locale={locale} ok={query.ok} code={query.error} />
      {booking.pin && booking.status === "confirmed" ? <p className="pin">{booking.pin}</p> : null}
      {booking.pin && booking.status === "confirmed" ? <p className="muted">{ar ? "هذا رقم الركوب. يكتبه السائق عند الموقف." : "This is your pickup number. The driver types it at the stop."}</p> : null}
      {booking.run ? (
        <LiveTrip
          locale={locale}
          runId={booking.run.id}
          initial={{
            lat: marker?.lat ?? null,
            lng: marker?.lng ?? null,
            etaMin: eta,
            awayKm,
            nextStop: pickup ? (ar ? pickup.nameAr : pickup.nameEn) : null,
            delayNote: booking.run.delayNote,
            plate: booking.run.vehicle.plate,
            driver: driver?.displayName ?? null,
            path: road?.path ?? [],
            points,
          }}
        />
      ) : (
        <p className="card">{ar ? "بانتظار مركبة على هذا الطريق." : "Waiting for a van on this road."}</p>
      )}
      <p>{pickup ? (ar ? pickup.nameAr : pickup.nameEn) : ""} → {drop ? (ar ? drop.nameAr : drop.nameEn) : ""}</p>
      <p>{booking.windowLabel} · {booking.rideMode === "private" ? (ar ? "أنا فقط" : "Just me") : (ar ? "شارك المركبة" : "Share the van")} · {booking.priceAed} AED</p>
      <p className="muted">{ar ? "المبلغ المتفق عليه مع السائق." : "The amount agreed with the driver."}</p>
      {booking.product === "monthly" ? <p className="muted">{ar ? "تتكرر من الأحد إلى الخميس. أوقفها من تبويب الشهر." : "This repeats Sunday to Thursday. Pause it from Month."}</p> : null}
      {booking.status === "completed" && booking.rating == null ? <RateForm locale={locale} bookingId={booking.id} next={`/${locale}/ride/trip/${booking.id}`} /> : null}
      {booking.rating ? <p>{ar ? `تقييمك ${booking.rating} من 5.` : `You gave ${booking.rating} out of 5.`}</p> : null}
      {booking.run ? <p><Link className="btn" href={`/${locale}/ride/chat/${booking.id}`}>{ar ? "محادثة السائق" : "Chat with the driver"}</Link></p> : null}
      {share ? <p><span>{m.share}</span><br /><a href={share}>{share}</a></p> : null}
      <form action={sendSos}>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="bookingId" value={booking.id} />
        <button className="btn danger" type="submit">{m.sos}</button>
      </form>
      <p className="muted">{m.sosBody}</p>
      {["confirmed", "pending_payment"].includes(booking.status) ? (
        <form action={cancelBooking}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="bookingId" value={booking.id} />
          <p className="muted">{m.cancelRule}</p>
          <button className="btn ghost" type="submit">{ar ? "إلغاء الرحلة" : "Cancel this ride"}</button>
        </form>
      ) : null}
      <p><Link href={`/${locale}/ride/help`}>{m.help}</Link> · <Link href={`/${locale}/privacy`}>{m.privacy}</Link></p>
    </>
  );
}

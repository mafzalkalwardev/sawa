import Link from "next/link";
import { notFound } from "next/navigation";
import { LiveTrip } from "@/components/live-trip";
import { Notice } from "@/components/notice";
import { t } from "@/i18n/copy";
import { requireRider } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { haversineKm, minutesAtPeak } from "@/lib/geo";
import { headers } from "next/headers";
import { cancelBooking, sendSos } from "@/server/actions/rider";

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
  const next = pickup;
  const eta = driver?.liveLat != null && driver.liveLng != null && next ? minutesAtPeak(haversineKm({ lat: driver.liveLat, lng: driver.liveLng }, next)) : next ? 12 : null;
  const host = (await headers()).get("host");
  const share = booking.shareToken ? `http://${host}/${locale}/share/${booking.shareToken}` : "";
  const points = [
    ...stops.map((stop) => ({ id: stop.id, lat: stop.lat, lng: stop.lng, label: ar ? stop.nameAr : stop.nameEn, kind: "stop" as const })),
    ...(driver?.liveLat != null && driver.liveLng != null ? [{ id: "live", lat: driver.liveLat, lng: driver.liveLng, label: driver.displayName, kind: "live" as const }] : []),
  ];
  return (
    <>
      <h1>{ar ? "رحلتك" : "Your trip"}</h1>
      <Notice locale={locale} ok={query.ok} code={query.error} />
      {booking.pin ? <p className="pin">{booking.pin}</p> : null}
      <p className="muted">{m.pin}</p>
      {booking.run ? (
        <LiveTrip
          runId={booking.run.id}
          initial={{
            lat: driver?.liveLat ?? null,
            lng: driver?.liveLng ?? null,
            etaMin: eta,
            nextStop: next ? (ar ? next.nameAr : next.nameEn) : null,
            delayNote: booking.run.delayNote,
            plate: booking.run.vehicle.plate,
            driver: driver?.displayName ?? null,
            path: stops.map((stop) => [stop.lat, stop.lng]),
            points,
          }}
        />
      ) : (
        <p className="card">{ar ? "تم الدفع. العمليات ستضعك على مركبة مرخّصة." : "Paid. Operations will place you on a licensed vehicle."}</p>
      )}
      <p>{pickup ? (ar ? pickup.nameAr : pickup.nameEn) : ""} → {drop ? (ar ? drop.nameAr : drop.nameEn) : ""}</p>
      <p>{booking.windowLabel}</p>
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
          <button className="btn ghost" type="submit">{ar ? "إلغاء المقعد" : "Cancel seat"}</button>
        </form>
      ) : null}
      <p><Link href={`/${locale}/ride/help`}>{m.help}</Link> · <Link href={`/${locale}/privacy`}>{m.privacy}</Link></p>
    </>
  );
}

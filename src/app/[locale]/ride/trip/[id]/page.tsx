import Link from "next/link";
import { notFound } from "next/navigation";
import { LiveTrip } from "@/components/live-trip";
import { Notice } from "@/components/notice";
import { t } from "@/i18n/copy";
import { requireRider } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { cancelBooking, changeBookingStops, sendSos } from "@/server/actions/rider";
import { LiveRefresh } from "@/components/live-refresh";
import { RateForm } from "@/components/rate-form";
import { CallBox } from "@/components/call-box";
import { answerSplit, offerSplit, payFromWallet } from "@/server/actions/money";
import { awayFromRoadKm, drive, minutesAlong, onRoad } from "@/server/routing";
import { hoursUntilShift } from "@/lib/time";

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
  const companions = booking.runId
    ? await prisma.booking.findMany({ where: { runId: booking.runId, status: { not: "cancelled" }, customerId: { not: customer.id } }, include: { customer: true } })
    : [];
  const splits = booking.runId
    ? await prisma.fareSplit.findMany({ where: { runId: booking.runId, status: "offered", OR: [{ fromCustomerId: customer.id }, { toCustomerId: customer.id }] } })
    : [];
  const pickup = await prisma.stop.findUnique({ where: { id: booking.pickupStopId } });
  const drop = await prisma.stop.findUnique({ where: { id: booking.dropStopId } });
  const m = t(locale);
  const ar = locale === "ar";
  const stops = booking.run?.route.stops ?? [];
  const routeStops = stops.length ? stops : await prisma.stop.findMany({ where: { routeId: booking.routeId }, orderBy: { sequence: "asc" } });
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
  const liveOnRoad = Boolean(road && live && onRoad(live, road.path));
  const target = booking.status === "boarded" && drop ? drop : pickup;
  const progress = liveOnRoad && road && live && target ? minutesAlong(road, live, target) : { minutes: null, passed: false };
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
            etaMin: progress.minutes,
            passed: progress.passed,
            awayKm,
            nextStop: target ? (ar ? target.nameAr : target.nameEn) : null,
            nextStopEn: target?.nameEn ?? null,
            nextStopAr: target?.nameAr ?? null,
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
      {booking.walletPaidAed > 0 ? <p>{ar ? `دُفع ${booking.walletPaidAed} درهم من المحفظة.` : `AED ${booking.walletPaidAed} paid from the wallet.`}</p> : null}
      {booking.walletPaidAed < booking.priceAed && booking.status !== "cancelled" ? (
        <form action={payFromWallet}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="bookingId" value={booking.id} />
          <button className="btn" type="submit">{ar ? `ادفع ${booking.priceAed - booking.walletPaidAed} درهم من المحفظة` : `Pay AED ${booking.priceAed - booking.walletPaidAed} from the wallet`}</button>
        </form>
      ) : null}
      {booking.run && driver ? <CallBox bookingId={booking.id} locale={locale} /> : null}
      {splits.filter((split) => split.toCustomerId === customer.id).map((split) => (
        <form key={split.id} className="card stack" action={answerSplit}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="splitId" value={split.id} />
          <p>{ar ? `راكب يريد أن تدفع ${split.amountAed} درهم من أجرته.` : `A passenger wants you to pay AED ${split.amountAed} of their fare.`}</p>
          <button className="btn" name="answer" value="yes" type="submit">{ar ? "أقبل الجزء" : "I'll take that part"}</button>
          <button className="btn ghost" name="answer" value="no" type="submit">{ar ? "لا" : "No"}</button>
        </form>
      ))}
      {booking.rideMode === "shared" && companions.length && booking.walletPaidAed < booking.priceAed ? (
        <form className="stack" action={offerSplit}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="bookingId" value={booking.id} />
          <label>{ar ? "اقسم الأجرة مع" : "Split the fare with"}
            <select name="toCustomerId">
              {companions.map((item) => <option key={item.id} value={item.customerId}>{item.customer.fullName.split(" ")[0]}</option>)}
            </select>
          </label>
          <label>{ar ? "المبلغ" : "Amount"}<input name="amount" type="number" min="1" max={booking.priceAed - 1} required /></label>
          <button className="btn ghost" type="submit">{ar ? "اطلب التقسيم" : "Ask to split"}</button>
        </form>
      ) : null}
      {booking.status === "completed" ? <p><Link className="btn ghost" href={`/${locale}/ride/receipt/${booking.id}`}>{ar ? "الإيصال" : "Receipt"}</Link></p> : null}
      {booking.status === "completed" && booking.rating == null ? <RateForm locale={locale} bookingId={booking.id} next={`/${locale}/ride/trip/${booking.id}`} /> : null}
      {booking.rating ? <p>{ar ? `تقييمك ${booking.rating} من 5.` : `You gave ${booking.rating} out of 5.`}</p> : null}
      {booking.run ? <p><Link className="btn" href={`/${locale}/ride/chat/${booking.id}`}>{ar ? "محادثة السائق" : "Chat with the driver"}</Link></p> : null}
      {share ? <p className="share-link"><span>{m.share}</span><br /><a href={share}>{share}</a></p> : null}
      <form action={sendSos}>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="bookingId" value={booking.id} />
        <button className="btn danger" type="submit">{m.sos}</button>
      </form>
      <p className="muted">{m.sosBody}</p>
      {["confirmed", "pending_payment"].includes(booking.status) && hoursUntilShift(booking.serviceDate, booking.shift) > 2 ? (
        <form className="stack" action={changeBookingStops}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="bookingId" value={booking.id} />
          <label>{m.pickup}
            <select name="pickupStopId" defaultValue={booking.pickupStopId}>
              {routeStops.map((stop) => <option key={stop.id} value={stop.id}>{ar ? stop.nameAr : stop.nameEn}</option>)}
            </select>
          </label>
          <label>{m.drop}
            <select name="dropStopId" defaultValue={booking.dropStopId}>
              {routeStops.map((stop) => <option key={stop.id} value={stop.id}>{ar ? stop.nameAr : stop.nameEn}</option>)}
            </select>
          </label>
          <p className="muted">{ar ? "قبل أكثر من ساعتين يمكنك تغيير الموقفين. حصة سالك تُضاف أو تُنقص. داخل الساعتين يبقى الموقف." : "More than 2 hours ahead, you can change the stops. The toll share is added or removed. Inside 2 hours the stops stay."}</p>
          <button className="btn ghost" type="submit">{ar ? "غيّر هذين الموقفين" : "Change these stops"}</button>
        </form>
      ) : null}
      {["confirmed", "pending_payment"].includes(booking.status) ? (
        hoursUntilShift(booking.serviceDate, booking.shift) > 2 ? (
          <form action={cancelBooking}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="bookingId" value={booking.id} />
            <p className="muted">{m.cancelRule}</p>
            <button className="btn ghost" type="submit">{ar ? "إلغاء الرحلة" : "Cancel this ride"}</button>
          </form>
        ) : <p className="muted">{m.cancelRule}</p>
      ) : null}
      <p><Link href={`/${locale}/ride/help`}>{m.help}</Link> · <Link href={`/${locale}/privacy`}>{m.privacy}</Link></p>
    </>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRider } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { agreeFare, createOrder, proposeFare, withdrawRequest } from "@/server/actions/requests";
import { holdsSeat } from "@/server/pool";
import { hoursUntilShift } from "@/lib/time";
import { Notice } from "@/components/notice";
import { ChatBox } from "@/components/chat-box";
import { LiveRefresh } from "@/components/live-refresh";
import { Steps, passengerSteps } from "@/components/steps";

export default async function RiderRequest({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { locale, id } = await params;
  const query = await searchParams;
  const customer = await requireRider(locale);
  const ar = locale === "ar";
  const request = await prisma.rideRequest.findFirst({ where: { id, customerId: customer.id } });
  if (!request) notFound();
  const pool = request.poolId ? await prisma.pool.findUnique({ where: { id: request.poolId }, include: { requests: { orderBy: { createdAt: "asc" } } } }) : null;
  const holding = pool?.requests.filter((item) => holdsSeat(item.status)) ?? [];
  const waiters = pool?.requests.filter((item) => item.status === "waiting") ?? [];
  const place = waiters.findIndex((item) => item.id === request.id) + 1;
  const stillWaiting = holding.some((item) => item.status === "queued");
  const early = hoursUntilShift(request.serviceDate, request.shift) > 2;
  const route = await prisma.route.findUnique({ where: { id: request.routeId } });
  const pickup = await prisma.stop.findUnique({ where: { id: request.pickupStopId } });
  const drop = await prisma.stop.findUnique({ where: { id: request.dropStopId } });
  const driver = request.driverId ? await prisma.driver.findUnique({ where: { id: request.driverId } }) : null;
  const thread = await prisma.chatThread.findUnique({ where: { requestId: id }, include: { messages: { orderBy: { createdAt: "asc" } } } });
  const status = request.status === "waiting" ? (ar ? "هذه المركبة ممتلئة. أنت على قائمة الانتظار." : "This van is full. You are on the waitlist.")
    : request.status === "cancelled" ? (ar ? "أُلغي هذا الطلب." : "This request is cancelled.")
    : request.status === "queued" ? (ar ? "بانتظار سائق على هذا الطريق." : "Waiting for a driver on this road.")
    : request.status === "accepted" ? (ar ? "اتفقا على السعر، أو أرسل سعرًا آخر." : "Agree this price, or send a different one.")
    : request.status === "agreed" ? (ar ? "اتفقتما. أكّد الرحلة." : "You both agreed. Confirm the ride.")
    : (ar ? "الرحلة مؤكدة." : "This ride is confirmed.");
  const canWithdraw = request.status === "waiting" || (early && ["queued", "accepted", "agreed"].includes(request.status));
  return (
    <>
      <LiveRefresh />
      <Notice locale={locale} code={query.error} ok={query.ok} />
      <Steps labels={passengerSteps(ar)} current={4} />
      <p className="card">{status}</p>
      <h1>{route ? (ar ? route.nameAr : route.nameEn) : ""}</h1>
      <p>{pickup ? (ar ? pickup.nameAr : pickup.nameEn) : ""} → {drop ? (ar ? drop.nameAr : drop.nameEn) : ""}</p>
      <p>{request.product === "monthly" ? (ar ? "شهري" : "Monthly") : (ar ? "يوم واحد" : "One day")} · {request.windowLabel}</p>
      {pool && request.status !== "waiting" ? <p className="card">{request.status === "ordered"
        ? (ar ? `${holding.length} من ${pool.seats} مقاعد. الرحلة مؤكدة.` : `${holding.length} of ${pool.seats} seats. This ride is confirmed.`)
        : stillWaiting
          ? (ar ? `${holding.length} من ${pool.seats} مقاعد. السعر ينقص ما دام مقعد بانتظار سائق.` : `${holding.length} of ${pool.seats} seats. The price falls while a seat is still waiting for a driver.`)
          : (ar ? `${holding.length} من ${pool.seats} مقاعد في هذه المركبة.` : `${holding.length} of ${pool.seats} seats are in this van.`)}</p> : null}
      {request.status === "waiting" && place > 0 ? <p className="card">{ar ? `ترتيبك ${place} من ${waiters.length} على قائمة الانتظار.` : `You are ${place} of ${waiters.length} on the waitlist.`}</p> : null}
      {driver ? <h2>{driver.displayName}</h2> : null}
      {request.offerAed && request.status !== "waiting" ? <p className="price">{request.offerAed} AED</p> : null}
      {request.status === "waiting" || request.status === "cancelled" ? null : <p className="muted">{request.riderAgreed ? (ar ? "أنت موافق" : "You agreed") : (ar ? "بانتظار موافقتك" : "Waiting for you")} · {request.driverAgreed ? (ar ? "السائق موافق" : "Driver agreed") : (ar ? "بانتظار السائق" : "Waiting for the driver")}</p>}
      {request.status === "accepted" || request.status === "agreed" ? (
        <>
          <form className="stack" action={proposeFare}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="requestId" value={id} />
            <label>{ar ? "سعر آخر" : "A different price"}<input key={request.offerAed} name="amount" type="number" min="1" defaultValue={request.offerAed ?? ""} required /></label>
            <button className="btn ghost" type="submit">{ar ? "أرسل هذا السعر" : "Send this price"}</button>
          </form>
          {!request.riderAgreed ? (
            <form action={agreeFare}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="requestId" value={id} />
              <button className="btn" type="submit">{ar ? "أوافق على هذا السعر" : "I agree to this price"}</button>
            </form>
          ) : null}
        </>
      ) : null}
      {request.status === "agreed" ? (
        <form action={createOrder}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="requestId" value={id} />
          <button className="btn" type="submit">{ar ? "أكّد الرحلة" : "Confirm the ride"}</button>
        </form>
      ) : null}
      {request.bookingId ? <p><Link className="btn" href={`/${locale}/ride/trip/${request.bookingId}`}>{ar ? "افتح الرحلة" : "Open the ride"}</Link></p> : null}
      {canWithdraw ? (
        <form action={withdrawRequest}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="requestId" value={id} />
          <p className="muted">{ar ? "الإلغاء قبل أكثر من ساعتين يحرر المقعد للشخص التالي." : "Cancelling more than 2 hours ahead releases the seat to the next person."}</p>
          <button className="btn ghost" type="submit">{ar ? "ألغِ هذا الطلب" : "Cancel this request"}</button>
        </form>
      ) : ["queued", "accepted", "agreed"].includes(request.status) ? <p className="muted">{ar ? "داخل الساعتين يبقى المقعد مع السائق." : "Inside 2 hours the seat stays with the driver."}</p> : null}
      {thread ? (
        <>
          <div className="thread">
            {thread.messages.map((message) => (
              <p key={message.id} className={`bubble ${message.senderKind === "rider" ? "me" : "them"}`}>{message.body}</p>
            ))}
          </div>
          <ChatBox locale={locale} requestId={id} bookingId={thread.bookingId || ""} label={ar ? "رسالة" : "Message"} sendLabel={ar ? "إرسال" : "Send"} />
        </>
      ) : null}
    </>
  );
}

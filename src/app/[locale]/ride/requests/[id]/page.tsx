import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRider } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { agreeFare, createOrder, proposeFare } from "@/server/actions/requests";
import { ChatBox } from "@/components/chat-box";
import { LiveRefresh } from "@/components/live-refresh";

export default async function RiderRequest({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const customer = await requireRider(locale);
  const ar = locale === "ar";
  const request = await prisma.rideRequest.findFirst({ where: { id, customerId: customer.id } });
  if (!request) notFound();
  const route = await prisma.route.findUnique({ where: { id: request.routeId } });
  const pickup = await prisma.stop.findUnique({ where: { id: request.pickupStopId } });
  const drop = await prisma.stop.findUnique({ where: { id: request.dropStopId } });
  const driver = request.driverId ? await prisma.driver.findUnique({ where: { id: request.driverId } }) : null;
  const thread = await prisma.chatThread.findUnique({ where: { requestId: id }, include: { messages: { orderBy: { createdAt: "asc" } } } });
  const status = request.status === "queued" ? (ar ? "في الانتظار" : "In the queue")
    : request.status === "accepted" ? (ar ? "السائق قبل" : "Driver accepted")
    : request.status === "agreed" ? (ar ? "المبلغ متفق عليه" : "Fare agreed")
    : (ar ? "تم الطلب" : "Order created");
  return (
    <>
      <LiveRefresh />
      <p className="pill">{status}</p>
      <h1>{route ? (ar ? route.nameAr : route.nameEn) : ""}</h1>
      <p>{pickup ? (ar ? pickup.nameAr : pickup.nameEn) : ""} → {drop ? (ar ? drop.nameAr : drop.nameEn) : ""}</p>
      <p>{request.product === "monthly" ? (ar ? "شهري" : "Monthly") : (ar ? "يوم واحد" : "One day")} · {request.windowLabel}</p>
      {request.status === "queued" ? <p className="card">{ar ? "بانتظار سائق على هذا الممر." : "Waiting for a driver on this corridor."}</p> : null}
      {driver ? <h2>{driver.displayName}</h2> : null}
      {request.offerAed ? <p className="price">{request.offerAed} AED</p> : null}
      <p className="muted">{request.riderAgreed ? (ar ? "أنت موافق" : "You agreed") : (ar ? "بانتظار موافقتك" : "Waiting for you")} · {request.driverAgreed ? (ar ? "السائق موافق" : "Driver agreed") : (ar ? "بانتظار السائق" : "Waiting for the driver")}</p>
      {request.status !== "queued" && request.status !== "ordered" ? (
        <>
          <form className="stack" action={proposeFare}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="requestId" value={id} />
            <label>{ar ? "عدّل المبلغ" : "Change the amount"}<input key={request.offerAed} name="amount" type="number" min="1" defaultValue={request.offerAed ?? ""} required /></label>
            <button className="btn ghost" type="submit">{ar ? "أرسل السعر" : "Send this price"}</button>
          </form>
          {!request.riderAgreed ? (
            <form action={agreeFare}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="requestId" value={id} />
              <button className="btn" type="submit">{ar ? "أوافق على المبلغ" : "I agree to this amount"}</button>
            </form>
          ) : null}
        </>
      ) : null}
      {request.status === "agreed" ? (
        <form action={createOrder}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="requestId" value={id} />
          <button className="btn" type="submit">{ar ? "إنشاء الطلب" : "Create the order"}</button>
        </form>
      ) : null}
      {request.bookingId ? <p><Link className="btn" href={`/${locale}/ride/trip/${request.bookingId}`}>{ar ? "الطلب" : "Open the order"}</Link></p> : null}
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

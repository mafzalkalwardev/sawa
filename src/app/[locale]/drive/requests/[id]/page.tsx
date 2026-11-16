import { notFound } from "next/navigation";
import { requireDriver } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { agreeFare, createOrder, proposeFare } from "@/server/actions/requests";
import { ChatBox } from "@/components/chat-box";
import { LiveRefresh } from "@/components/live-refresh";

export default async function DriverRequest({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const driver = await requireDriver(locale);
  const ar = locale === "ar";
  const request = await prisma.rideRequest.findFirst({ where: { id, driverId: driver.id } });
  if (!request) notFound();
  const person = await prisma.customer.findUnique({ where: { id: request.customerId } });
  const route = await prisma.route.findUnique({ where: { id: request.routeId } });
  const thread = await prisma.chatThread.findUnique({ where: { requestId: id }, include: { messages: { orderBy: { createdAt: "asc" } } } });
  return (
    <>
      <LiveRefresh />
      <p className="pill">{request.product === "monthly" ? (ar ? "شهري" : "Monthly") : (ar ? "يوم واحد" : "One day")}</p>
      <h1>{person?.fullName}</h1>
      {person?.photoUrl ? <img className="avatar" src={`/api/files/riders/${person.id}/${person.photoUrl}`} alt="" /> : null}
      {person?.idDocumentUrl ? <p><img src={`/api/files/riders/${person.id}/${person.idDocumentUrl}`} alt="" style={{ width: "100%", borderRadius: 16 }} /></p> : null}
      <p>{route ? (ar ? route.nameAr : route.nameEn) : ""} · {request.windowLabel}</p>
      {request.offerAed ? <p className="price">{request.offerAed} AED</p> : null}
      <p className="muted">{request.driverAgreed ? (ar ? "أنت موافق" : "You agreed") : (ar ? "بانتظار موافقتك" : "Waiting for you")}</p>
      {request.status !== "ordered" ? (
        <>
          <form className="stack" action={proposeFare}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="requestId" value={id} />
            <label>{ar ? "سعرك" : "Your price"}<input key={request.offerAed} name="amount" type="number" min="1" defaultValue={request.offerAed ?? ""} required /></label>
            <button className="btn ghost" type="submit">{ar ? "أرسل السعر" : "Send this price"}</button>
          </form>
          {!request.driverAgreed ? (
            <form action={agreeFare}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="requestId" value={id} />
              <button className="btn" type="submit">{ar ? "أوافق" : "I agree"}</button>
            </form>
          ) : null}
          {request.status === "agreed" ? (
            <form action={createOrder}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="requestId" value={id} />
              <button className="btn" type="submit">{ar ? "إنشاء الطلب" : "Create the order"}</button>
            </form>
          ) : null}
        </>
      ) : <p className="card">{ar ? "تم إنشاء الطلب." : "The order is created."}</p>}
      {thread ? (
        <>
          <div className="thread">
            {thread.messages.map((message) => (
              <p key={message.id} className={`bubble ${message.senderKind === "driver" ? "me" : "them"}`}>{message.body}</p>
            ))}
          </div>
          <ChatBox locale={locale} requestId={id} bookingId={thread.bookingId || ""} label={ar ? "رسالة" : "Message"} sendLabel={ar ? "إرسال" : "Send"} />
        </>
      ) : null}
    </>
  );
}

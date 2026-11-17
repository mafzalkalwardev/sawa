import Link from "next/link";
import { notFound } from "next/navigation";
import { requireDriver } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendChat } from "@/server/actions/chat";
import { copyRequestChat } from "@/server/chat";

export default async function DriveThread({
  params,
}: {
  params: Promise<{ locale: string; bookingId: string }>;
}) {
  const { locale, bookingId } = await params;
  const driver = await requireDriver(locale);
  const ar = locale === "ar";
  let thread = await prisma.chatThread.findFirst({
    where: { bookingId, driverId: driver.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!thread) notFound();
  if (thread.messages.length === 0) {
    const request = await prisma.rideRequest.findFirst({ where: { bookingId } });
    if (request) {
      await copyRequestChat(request.id, bookingId);
      thread = await prisma.chatThread.findFirst({
        where: { id: thread.id },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      }) || thread;
    }
  }
  const rider = await prisma.customer.findUnique({ where: { id: thread.customerId } });
  return (
    <>
      <p><Link href={`/${locale}/drive/chat`}>{ar ? "كل الركاب" : "All riders"}</Link></p>
      <h1>{rider?.fullName || (ar ? "الراكب" : "Rider")}</h1>
      <div className="thread">
        {thread.messages.map((message) => (
          <p key={message.id} className={`bubble ${message.senderKind === "driver" ? "me" : "them"}`}>{message.body}</p>
        ))}
      </div>
      <form className="stack" action={sendChat} style={{ marginTop: 16 }}>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="bookingId" value={bookingId} />
        <label>{ar ? "رسالة" : "Message"}<input name="body" required maxLength={500} /></label>
        <button className="btn" type="submit">{ar ? "إرسال" : "Send"}</button>
      </form>
    </>
  );
}

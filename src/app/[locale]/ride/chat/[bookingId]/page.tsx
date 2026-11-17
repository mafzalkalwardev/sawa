import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRider } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ChatBox } from "@/components/chat-box";
import { LiveRefresh } from "@/components/live-refresh";
import { copyRequestChat } from "@/server/chat";

export default async function RideThread({
  params,
}: {
  params: Promise<{ locale: string; bookingId: string }>;
}) {
  const { locale, bookingId } = await params;
  const customer = await requireRider(locale);
  const ar = locale === "ar";
  let thread = await prisma.chatThread.findFirst({
    where: { bookingId, customerId: customer.id },
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
  const driver = await prisma.driver.findUnique({ where: { id: thread.driverId } });
  return (
    <>
      <p><Link href={`/${locale}/ride/chat`}>{ar ? "كل المحادثات" : "All chats"}</Link></p>
      <LiveRefresh />
      <h1>{driver?.displayName || (ar ? "السائق" : "Driver")}</h1>
      <div className="thread">
        {thread.messages.map((message) => (
          <p key={message.id} className={`bubble ${message.senderKind === "rider" ? "me" : "them"}`}>{message.body}</p>
        ))}
      </div>
      <ChatBox locale={locale} bookingId={bookingId} label={ar ? "رسالة" : "Message"} sendLabel={ar ? "إرسال" : "Send"} />
    </>
  );
}

import Link from "next/link";
import { requireRider } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function RideChats({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const customer = await requireRider(locale);
  const ar = locale === "ar";
  const threads = await prisma.chatThread.findMany({
    where: { customerId: customer.id },
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });
  const drivers = await prisma.driver.findMany({ where: { id: { in: threads.map((thread) => thread.driverId) } } });
  const name = (id: string) => drivers.find((driver) => driver.id === id)?.displayName || (ar ? "السائق" : "Driver");
  return (
    <>
      <h1>{ar ? "المحادثات" : "Chats"}</h1>
      <p className="muted">{ar ? "تفتح المحادثة بعد تطابق الممر، كما كان الناس ينسّقون على واتساب." : "A chat opens after the corridor matches, the way people used to coordinate on WhatsApp."}</p>
      {threads.length === 0 ? <p className="card">{ar ? "لا توجد محادثة بعد." : "No chat yet."}</p> : null}
      {threads.map((thread) => (
        <Link key={thread.id} className="corridor" href={`/${locale}/ride/chat/${thread.bookingId}`}>
          <span className="corridor-title"><strong>{name(thread.driverId)}</strong></span>
          <span className="muted">{thread.messages[0]?.body || (ar ? "ابدأ المحادثة" : "Start the chat")}</span>
        </Link>
      ))}
    </>
  );
}

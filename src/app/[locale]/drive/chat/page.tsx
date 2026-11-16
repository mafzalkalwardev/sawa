import Link from "next/link";
import { requireDriver } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function DriveChats({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const driver = await requireDriver(locale);
  const ar = locale === "ar";
  const threads = await prisma.chatThread.findMany({
    where: { driverId: driver.id },
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });
  const people = await prisma.customer.findMany({ where: { id: { in: threads.map((thread) => thread.customerId) } } });
  const name = (id: string) => people.find((person) => person.id === id)?.fullName || (ar ? "الراكب" : "Rider");
  return (
    <>
      <h1>{ar ? "ركاب الممر" : "Riders on your route"}</h1>
      {threads.length === 0 ? <p className="card">{ar ? "لا يوجد راكب متصل." : "No rider is connected yet."}</p> : null}
      {threads.map((thread) => (
        <Link key={thread.id} className="corridor" href={`/${locale}/drive/chat/${thread.bookingId}`}>
          <span className="corridor-title"><strong>{name(thread.customerId)}</strong></span>
          <span className="muted">{thread.messages[0]?.body || ""}</span>
        </Link>
      ))}
    </>
  );
}

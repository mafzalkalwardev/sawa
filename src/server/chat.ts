import { prisma } from "@/lib/db";
import { nid } from "@/lib/ids";

export async function openChat(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { run: true },
  });
  if (!booking?.run) return null;
  return prisma.chatThread.upsert({
    where: { bookingId },
    update: { driverId: booking.run.driverId, customerId: booking.customerId },
    create: {
      id: nid("chat"),
      bookingId,
      driverId: booking.run.driverId,
      customerId: booking.customerId,
    },
  });
}

export async function copyRequestChat(requestId: string, bookingId: string) {
  const source = await prisma.chatThread.findUnique({
    where: { requestId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  const target = await prisma.chatThread.findUnique({ where: { bookingId } });
  if (!source || !target || source.messages.length === 0) return target;
  const already = await prisma.chatMessage.count({ where: { threadId: target.id } });
  if (already > 0) return target;
  await prisma.chatMessage.createMany({
    data: source.messages.map((message) => ({
      id: nid("msg"),
      threadId: target.id,
      senderKind: message.senderKind,
      body: message.body,
      createdAt: message.createdAt,
    })),
  });
  return target;
}

export async function say(threadId: string, senderKind: "rider" | "driver", body: string) {
  const text = body.trim().slice(0, 500);
  if (!text) return null;
  return prisma.chatMessage.create({
    data: { id: nid("msg"), threadId, senderKind, body: text },
  });
}

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

export async function say(threadId: string, senderKind: "rider" | "driver", body: string) {
  const text = body.trim().slice(0, 500);
  if (!text) return null;
  return prisma.chatMessage.create({
    data: { id: nid("msg"), threadId, senderKind, body: text },
  });
}

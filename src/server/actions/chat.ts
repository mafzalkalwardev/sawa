"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { say } from "@/server/chat";
import { tellDriver, tellRider } from "@/server/updates";

export async function sendChat(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const bookingId = String(formData.get("bookingId") || "");
  const requestId = String(formData.get("requestId") || "");
  const body = String(formData.get("body") || "");
  const session = await getSession();
  const thread = requestId
    ? await prisma.chatThread.findUnique({ where: { requestId } })
    : await prisma.chatThread.findUnique({ where: { bookingId } });
  if (!session || !thread) redirect(`/${locale}/app`);
  const mine = session.kind === "rider" ? session.id === thread.customerId : session.kind === "driver" && session.id === thread.driverId;
  if (!mine) redirect(`/${locale}/app`);
  const kind = session.kind === "driver" ? "driver" : "rider";
  await say(thread.id, kind, body);
  if (requestId) {
    const request = await prisma.rideRequest.findUnique({ where: { id: requestId } });
    if (request?.bookingId) {
      const other = await prisma.chatThread.findUnique({ where: { bookingId: request.bookingId } });
      if (other && other.id !== thread.id) await say(other.id, kind, body);
    }
  } else if (bookingId) {
    const request = await prisma.rideRequest.findFirst({ where: { bookingId } });
    if (request) {
      const other = await prisma.chatThread.findUnique({ where: { requestId: request.id } });
      if (other && other.id !== thread.id) await say(other.id, kind, body);
    }
  }
  const preview = body.trim().slice(0, 80);
  if (kind === "driver") {
    await tellRider(thread.customerId, "message", `New message: ${preview}`, `رسالة جديدة: ${preview}`, thread.bookingId || undefined);
  } else {
    await tellDriver(thread.driverId, "message", `New message: ${preview}`, `رسالة جديدة: ${preview}`, thread.bookingId || undefined);
  }
  const base = session.kind === "driver" ? "drive" : "ride";
  if (requestId) redirect(`/${locale}/${base}/requests/${requestId}`);
  redirect(`/${locale}/${base}/chat/${bookingId}`);
}

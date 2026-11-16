"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { say } from "@/server/chat";

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
  await say(thread.id, session.kind === "driver" ? "driver" : "rider", body);
  const base = session.kind === "driver" ? "drive" : "ride";
  if (requestId) redirect(`/${locale}/${base}/requests/${requestId}`);
  redirect(`/${locale}/${base}/chat/${bookingId}`);
}

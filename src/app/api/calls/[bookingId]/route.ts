import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { nid } from "@/lib/ids";

async function party(bookingId: string) {
  const session = await getSession();
  if (!session || (session.kind !== "rider" && session.kind !== "driver")) return null;
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { run: { include: { driver: true } }, customer: true },
  });
  if (!booking?.run) return null;
  const rider = session.kind === "rider" && session.id === booking.customerId;
  const driver = session.kind === "driver" && session.id === booking.run.driverId;
  if (!rider && !driver) return null;
  return {
    kind: rider ? "rider" as const : "driver" as const,
    peerName: rider ? booking.run.driver.displayName : booking.customer.fullName.split(" ")[0] || "Passenger",
    booking,
  };
}

export async function GET(_: Request, context: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await context.params;
  const who = await party(bookingId);
  if (!who) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const session = await prisma.callSession.findFirst({
    where: { bookingId, status: { in: ["ringing", "active"] } },
    orderBy: { createdAt: "desc" },
    include: { ice: { orderBy: { createdAt: "asc" } } },
  });
  return NextResponse.json({
    role: who.kind,
    peerName: who.peerName,
    call: session
      ? {
          id: session.id,
          status: session.status,
          callerKind: session.callerKind,
          offer: session.offer,
          answer: session.answer,
          ice: session.ice.map((item) => ({ id: item.id, fromKind: item.fromKind, candidate: item.candidate })),
        }
      : null,
  });
}

export async function POST(request: Request, context: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await context.params;
  const who = await party(bookingId);
  if (!who) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "");
  if (action === "ring") {
    const existing = await prisma.callSession.findFirst({ where: { bookingId, status: { in: ["ringing", "active"] } } });
    if (existing) return NextResponse.json({ id: existing.id });
    const created = await prisma.callSession.create({
      data: { id: nid("call"), bookingId, callerKind: who.kind, status: "ringing" },
    });
    return NextResponse.json({ id: created.id });
  }
  const id = String(body.id || "");
  const call = await prisma.callSession.findFirst({ where: { id, bookingId } });
  if (!call || !["ringing", "active"].includes(call.status)) return NextResponse.json({ error: "missing" }, { status: 404 });
  if (action === "offer" && call.callerKind === who.kind) {
    await prisma.callSession.update({ where: { id }, data: { offer: String(body.offer || "").slice(0, 20000) } });
  } else if (action === "answer" && call.callerKind !== who.kind) {
    await prisma.callSession.update({
      where: { id },
      data: { answer: String(body.answer || "").slice(0, 20000), status: "active" },
    });
  } else if (action === "ice") {
    const candidate = String(body.candidate || "").slice(0, 4000);
    if (candidate) {
      await prisma.callIce.create({ data: { id: nid("ice"), sessionId: id, fromKind: who.kind, candidate } });
    }
  } else if (action === "decline" && call.callerKind !== who.kind) {
    await prisma.callSession.update({ where: { id }, data: { status: "declined" } });
  } else if (action === "hangup") {
    await prisma.callSession.update({ where: { id }, data: { status: "ended" } });
  }
  return NextResponse.json({ ok: true });
}

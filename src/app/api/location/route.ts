import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { haversineKm } from "@/lib/geo";
import { nid } from "@/lib/ids";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.kind !== "driver") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const driver = await prisma.driver.findUnique({ where: { id: session.id } });
  if (!driver?.onShift) return NextResponse.json({ error: "off-shift" }, { status: 403 });
  const body = await request.json().catch(() => null) as { lat?: number; lng?: number; source?: string } | null;
  if (!body || typeof body.lat !== "number" || typeof body.lng !== "number") {
    return NextResponse.json({ error: "bad" }, { status: 400 });
  }
  const run = await prisma.run.findFirst({
    where: { driverId: driver.id, status: "live" },
    include: { route: { include: { stops: true } } },
  });
  const anchors = [
    ...(run?.route.stops ?? []),
    ...(driver.baseLat != null && driver.baseLng != null ? [{ lat: driver.baseLat, lng: driver.baseLng }] : []),
  ];
  const nearestKm = anchors.length
    ? Math.min(...anchors.map((stop) => haversineKm({ lat: body.lat as number, lng: body.lng as number }, stop)))
    : 0;
  if (nearestKm > 40) return NextResponse.json({ ok: true, ignored: "off-corridor" });
  await prisma.driver.update({
    where: { id: driver.id },
    data: { liveLat: body.lat, liveLng: body.lng, liveAt: new Date() },
  });
  await prisma.locationPing.create({
    data: { id: nid("png"), driverId: driver.id, lat: body.lat, lng: body.lng, source: body.source === "gps" ? "gps" : "simulator" },
  });
  return NextResponse.json({ ok: true });
}

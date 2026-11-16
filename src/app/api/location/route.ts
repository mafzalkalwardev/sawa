import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { nid } from "@/lib/ids";
import { drive, onRoad } from "@/server/routing";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.kind !== "driver") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const driver = await prisma.driver.findUnique({ where: { id: session.id } });
  if (!driver?.onShift) return NextResponse.json({ error: "off-shift" }, { status: 403 });
  const body = await request.json().catch(() => null) as { lat?: number; lng?: number; source?: string } | null;
  if (!body || typeof body.lat !== "number" || typeof body.lng !== "number") {
    return NextResponse.json({ error: "bad" }, { status: 400 });
  }
  const fix = { lat: body.lat, lng: body.lng };
  const run = await prisma.run.findFirst({
    where: { driverId: driver.id, status: "live" },
    include: { route: { include: { stops: { orderBy: { sequence: "asc" } } } } },
  });
  const road = run ? await drive(run.route.stops) : null;
  const nearRoad = road ? onRoad(fix, road.path) : false;
  await prisma.locationPing.create({
    data: { id: nid("png"), driverId: driver.id, lat: fix.lat, lng: fix.lng, source: body.source === "gps" ? "gps" : "simulator" },
  });
  if (nearRoad) {
    await prisma.driver.update({
      where: { id: driver.id },
      data: { liveLat: fix.lat, liveLng: fix.lng, liveAt: new Date() },
    });
  }
  return NextResponse.json({ ok: true, onCorridor: nearRoad });
}

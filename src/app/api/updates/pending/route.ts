import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session || (session.kind !== "rider" && session.kind !== "driver")) {
    return NextResponse.json({ updates: [] });
  }
  const rows = await prisma.rideUpdate.findMany({
    where: session.kind === "rider" ? { customerId: session.id, readAt: null } : { driverId: session.id, readAt: null },
    orderBy: { createdAt: "desc" },
    take: 8,
  });
  return NextResponse.json({
    updates: rows.map((row) => ({ id: row.id, en: row.bodyEn, ar: row.bodyAr })),
  });
}

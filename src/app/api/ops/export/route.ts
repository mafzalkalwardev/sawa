import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/roles";
import { audit } from "@/server/records";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.kind !== "staff") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const staff = await prisma.staffUser.findUnique({ where: { id: session.id } });
  if (!staff || !can(staff.role, "export")) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const kind = new URL(request.url).searchParams.get("kind") || "trips";
  const bookings = await prisma.booking.findMany({ include: { customer: true }, orderBy: { serviceDate: "desc" }, take: 500 });
  const routes = await prisma.route.findMany();
  const names = new Map(routes.map((route) => [route.id, route.slug]));
  const lines = ["date,route,rider,status,price_aed,product"];
  if (kind === "trips") {
    for (const booking of bookings) {
      lines.push([booking.serviceDate, names.get(booking.routeId) || "", booking.customer.fullName.replaceAll(",", " "), booking.status, booking.priceAed, booking.product].join(","));
    }
  }
  await audit({ actorId: staff.id, actorName: staff.name, action: "export", entity: "report", entityId: kind });
  return new NextResponse(lines.join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=sawa-trips.csv",
    },
  });
}

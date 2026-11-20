import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { path: parts } = await context.params;
  if (parts.some((part) => part.includes(".."))) return NextResponse.json({ error: "bad" }, { status: 400 });
  let file = "";
  if (parts[0] === "riders" && parts.length === 3) {
    const customerId = parts[1];
    const name = parts[2];
    if (session.kind === "rider" && session.id !== customerId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (session.kind === "driver") {
      const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { photoUrl: true } });
      if (!customer?.photoUrl || name !== customer.photoUrl) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    file = path.join(process.cwd(), "data", "uploads", "riders", customerId, name);
  } else if (parts.length === 2) {
    const [driverId, name] = parts;
    if (session.kind === "driver" && session.id !== driverId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (session.kind === "rider") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    file = path.join(process.cwd(), "data", "uploads", driverId, name);
  } else {
    return NextResponse.json({ error: "bad" }, { status: 400 });
  }
  try {
    const bytes = await readFile(file);
    const type = file.endsWith(".png") ? "image/png" : file.endsWith(".webp") ? "image/webp" : "image/jpeg";
    return new NextResponse(bytes, { headers: { "content-type": type } });
  } catch {
    return NextResponse.json({ error: "missing" }, { status: 404 });
  }
}

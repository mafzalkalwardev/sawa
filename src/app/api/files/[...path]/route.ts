import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { path: parts } = await context.params;
  if (parts.length !== 2) return NextResponse.json({ error: "bad" }, { status: 400 });
  const [driverId, name] = parts;
  if (session.kind === "driver" && session.id !== driverId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.kind === "rider") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (name.includes("..") || driverId.includes("..")) return NextResponse.json({ error: "bad" }, { status: 400 });
  const file = path.join(process.cwd(), "data", "uploads", driverId, name);
  try {
    const bytes = await readFile(file);
    return new NextResponse(bytes, { headers: { "content-type": "application/octet-stream" } });
  } catch {
    return NextResponse.json({ error: "missing" }, { status: 404 });
  }
}

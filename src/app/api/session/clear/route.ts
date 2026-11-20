import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const jar = await cookies();
  jar.delete("sawa_session");
  const next = new URL(request.url).searchParams.get("next") || "/en/app";
  const safe = next.startsWith("/") && !next.startsWith("//") ? next : "/en/app";
  return NextResponse.redirect(new URL(safe, request.url));
}

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const locale = pathname === "/ar" || pathname.startsWith("/ar/") ? "ar" : "en";
  const headers = new Headers(request.headers);
  headers.set("x-locale", locale);
  headers.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};

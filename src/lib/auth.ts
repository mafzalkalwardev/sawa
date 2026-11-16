import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db";
import { can, type StaffAction } from "./roles";

export type Session =
  | { kind: "rider"; id: string; exp: number }
  | { kind: "driver"; id: string; exp: number }
  | { kind: "staff"; id: string; role: string; name: string; exp: number };

type SessionInput =
  | { kind: "rider"; id: string }
  | { kind: "driver"; id: string }
  | { kind: "staff"; id: string; role: string; name: string };

const COOKIE = "sawa_session";

function secret() {
  return process.env.SESSION_SECRET || "sawa-demo-session-secret-change-before-any-real-deployment";
}

function sign(body: string) {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

export function encodeSession(session: Session) {
  const body = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function decodeSession(token: string | undefined | null): Session | null {
  if (!token) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = sign(body);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const session = JSON.parse(Buffer.from(body, "base64url").toString()) as Session;
    if (!session.exp || session.exp < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export async function getSession() {
  const jar = await cookies();
  return decodeSession(jar.get(COOKIE)?.value);
}

export async function setSession(session: SessionInput) {
  const full = { ...session, exp: Date.now() + 1000 * 60 * 60 * 24 * 30 } as Session;
  const jar = await cookies();
  jar.set(COOKIE, encodeSession(full), {
    httpOnly: true,
    sameSite: "lax",
    secure: (process.env.NEXT_PUBLIC_APP_URL || "").startsWith("https://"),
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function requireRider(locale: string) {
  const session = await getSession();
  if (!session || session.kind !== "rider") redirect(`/${locale}/ride/login`);
  const customer = await prisma.customer.findUnique({ where: { id: session.id } });
  if (!customer || customer.status === "deleted") {
    await clearSession();
    redirect(`/${locale}/ride/login`);
  }
  return customer;
}

export async function requireDriver(locale: string) {
  const session = await getSession();
  if (!session || session.kind !== "driver") redirect(`/${locale}/drive/login`);
  const driver = await prisma.driver.findUnique({
    where: { id: session.id },
    include: { operator: true, vehicles: true },
  });
  if (!driver) {
    await clearSession();
    redirect(`/${locale}/drive/login`);
  }
  return driver;
}

export async function requireStaff(locale: string, action?: StaffAction) {
  const session = await getSession();
  if (!session || session.kind !== "staff") redirect(`/${locale}/ops/login`);
  const staff = await prisma.staffUser.findUnique({ where: { id: session.id } });
  if (!staff || !staff.active) {
    await clearSession();
    redirect(`/${locale}/ops/login`);
  }
  if (action && !can(staff.role, action)) {
    redirect(`/${locale}/ops?error=forbidden`);
  }
  return staff;
}

"use server";

import { redirect } from "next/navigation";
import { clearSession, setSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { nid } from "@/lib/ids";
import { normalizePhone } from "@/lib/phone";
import { verifyPassword } from "@/lib/password";
import { DEMO_OTP } from "@/lib/time";
import { audit } from "@/server/records";
import { ensureReferralCode } from "@/server/wallet";

function surface(mode: string) {
  return mode === "driver" ? "drive" : "ride";
}

function safeNext(value: string, locale: string) {
  if (!value.startsWith(`/${locale}/`)) return "";
  if (value.includes("://") || value.includes("\\") || value.includes("//")) return "";
  return value;
}

export async function logout(formData: FormData) {
  await clearSession();
  redirect(String(formData.get("next") || "/en"));
}

export async function requestOtp(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const mode = String(formData.get("mode") || "rider");
  const phone = normalizePhone(String(formData.get("phone") || ""));
  const next = safeNext(String(formData.get("next") || ""), locale);
  const base = `/${locale}/${surface(mode)}/login`;
  if (!phone.startsWith("+971") || phone.length < 12) redirect(`${base}?error=missing`);
  if (mode === "driver") {
    const driver = await prisma.driver.findUnique({ where: { phone } });
    if (!driver) redirect(`${base}?error=new`);
    await setSession({ kind: "driver", id: driver.id });
    redirect(`/${locale}/drive`);
  }
  const existingDriver = await prisma.driver.findUnique({ where: { phone } });
  if (existingDriver) redirect(`${base}?error=driver`);
  const customer = await prisma.customer.findUnique({ where: { phone } });
  if (!customer || customer.status === "deleted") redirect(`/${locale}/ride/signup?error=new`);
  await setSession({ kind: "rider", id: customer.id });
  if (!customer.fullName || !customer.photoUrl || !customer.idDocumentUrl) redirect(`/${locale}/ride/profile${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  redirect(next || `/${locale}/ride`);
}

export async function joinRider(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const phone = normalizePhone(String(formData.get("phone") || ""));
  const base = `/${locale}/ride/signup`;
  if (!phone.startsWith("+971") || phone.length < 12) redirect(`${base}?error=missing`);
  if (await prisma.driver.findUnique({ where: { phone } })) redirect(`${base}?error=driver`);
  const existing = await prisma.customer.findUnique({ where: { phone } });
  if (existing && existing.status !== "deleted" && existing.fullName && existing.photoUrl && existing.idDocumentUrl) {
    redirect(`/${locale}/ride/login?error=exists`);
  }
  const code = String(formData.get("referral") || "").trim().toUpperCase();
  let referredById: string | null = null;
  if (code) {
    const referrer = await prisma.customer.findUnique({ where: { referralCode: code } });
    if (!referrer || referrer.phone === phone || referrer.status === "deleted") redirect(`${base}?error=referral`);
    referredById = referrer.id;
  }
  const customer = existing ?? await prisma.customer.create({
    data: {
      id: nid("cus"),
      fullName: "",
      phone,
      language: locale === "ar" ? "ar" : "en",
      status: "active",
      referredById,
      preference: { create: { id: nid("pref") } },
    },
  });
  if (existing?.status === "deleted") {
    await prisma.customer.update({ where: { id: existing.id }, data: { status: "active", deletedAt: null, referredById: existing.referredById ?? referredById } });
  } else if (existing && !existing.referredById && referredById) {
    await prisma.customer.update({ where: { id: existing.id }, data: { referredById } });
  }
  await ensureReferralCode(customer.id);
  await setSession({ kind: "rider", id: customer.id });
  redirect(`/${locale}/ride/profile`);
}

export async function joinDriver(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const phone = normalizePhone(String(formData.get("phone") || ""));
  const fullName = String(formData.get("fullName") || "").trim();
  const routeSlug = String(formData.get("routeSlug") || "");
  const base = `/${locale}/drive/signup`;
  if (!phone.startsWith("+971") || phone.length < 12 || fullName.length < 2) redirect(`${base}?error=missing`);
  const route = await prisma.route.findFirst({ where: { slug: routeSlug, active: true } });
  if (!route) redirect(`${base}?error=missing`);
  if (await prisma.driver.findUnique({ where: { phone } })) redirect(`/${locale}/drive/login?error=exists`);
  if (await prisma.customer.findUnique({ where: { phone } })) redirect(`${base}?error=rider`);
  const operator = await prisma.operator.findFirst({ where: { active: true } });
  if (!operator) redirect(`${base}?error=missing`);
  const driver = await prisma.driver.create({
    data: {
      id: nid("drv"),
      operatorId: operator.id,
      fullName,
      displayName: fullName.split(" ")[0] || fullName,
      phone,
      employmentType: "applicant",
      status: "submitted",
      preferredRouteIds: route.slug,
      languages: locale === "ar" ? "ar,en" : "en,ar",
    },
  });
  await setSession({ kind: "driver", id: driver.id });
  redirect(`/${locale}/drive/documents`);
}

export async function verifyOtp(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const mode = String(formData.get("mode") || "rider");
  const phone = normalizePhone(String(formData.get("phone") || ""));
  const code = String(formData.get("code") || "").trim();
  const base = `/${locale}/${surface(mode)}/login`;
  if (code !== DEMO_OTP) redirect(`${base}?sent=1&phone=${encodeURIComponent(phone)}&error=otp`);
  await prisma.otpChallenge.updateMany({ where: { phone, consumed: false }, data: { consumed: true } });
  const driver = await prisma.driver.findUnique({ where: { phone } });

  if (mode === "driver") {
    if (!driver) redirect(`${base}?error=rider`);
    await setSession({ kind: "driver", id: driver.id });
    redirect(`/${locale}/drive`);
  }

  if (driver) redirect(`${base}?error=driver`);
  let customer = await prisma.customer.findUnique({ where: { phone } });
  if (!customer || customer.status === "deleted") {
    customer = await prisma.customer.create({
      data: {
        id: nid("cus"),
        fullName: "",
        phone,
        language: locale === "ar" ? "ar" : "en",
        status: "active",
        preference: { create: { id: nid("pref") } },
      },
    });
    await setSession({ kind: "rider", id: customer.id });
    redirect(`/${locale}/ride/profile`);
  }
  await setSession({ kind: "rider", id: customer.id });
  if (!customer.fullName) redirect(`/${locale}/ride/profile`);
  redirect(`/${locale}/ride`);
}

export async function staffLogin(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const staff = await prisma.staffUser.findUnique({ where: { email } });
  if (!staff || !staff.active || !verifyPassword(password, staff.passwordHash)) {
    redirect(`/${locale}/ops/login?error=otp`);
  }
  await prisma.staffUser.update({ where: { id: staff.id }, data: { lastLogin: new Date() } });
  await setSession({ kind: "staff", id: staff.id, role: staff.role, name: staff.name });
  await audit({ actorId: staff.id, actorName: staff.name, action: "login", entity: "staff", entityId: staff.id });
  redirect(`/${locale}/ops`);
}

"use server";

import { redirect } from "next/navigation";
import { clearSession, setSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { nid } from "@/lib/ids";
import { normalizePhone } from "@/lib/phone";
import { verifyPassword } from "@/lib/password";
import { DEMO_OTP } from "@/lib/time";
import { audit } from "@/server/records";

function surface(mode: string) {
  return mode === "driver" ? "drive" : "ride";
}

export async function logout(formData: FormData) {
  await clearSession();
  redirect(String(formData.get("next") || "/en"));
}

export async function requestOtp(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const mode = String(formData.get("mode") || "rider");
  const phone = normalizePhone(String(formData.get("phone") || ""));
  const base = `/${locale}/${surface(mode)}/login`;
  if (!phone.startsWith("+971") || phone.length < 12) redirect(`${base}?error=missing`);
  await prisma.otpChallenge.create({
    data: {
      id: nid("otp"),
      phone,
      code: DEMO_OTP,
      purpose: mode,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });
  redirect(`${base}?sent=1&phone=${encodeURIComponent(phone)}`);
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

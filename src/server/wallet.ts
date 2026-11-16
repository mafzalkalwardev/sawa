import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { nid } from "@/lib/ids";

export const REFERRAL_AED = 20;

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeReferralCode() {
  const bytes = randomBytes(6);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export async function ensureReferralCode(customerId: string) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return "";
  if (customer.referralCode) return customer.referralCode;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const updated = await prisma.customer.update({
        where: { id: customerId },
        data: { referralCode: makeReferralCode() },
      });
      return updated.referralCode ?? "";
    } catch {
      const again = await prisma.customer.findUnique({ where: { id: customerId } });
      if (again?.referralCode) return again.referralCode;
    }
  }
  return "";
}

export async function addWallet(customerId: string, amountAed: number, reason: string, bookingId?: string) {
  if (!amountAed) return;
  await prisma.walletEntry.create({
    data: { id: nid("wal"), customerId, amountAed, reason, bookingId: bookingId ?? null },
  });
  await prisma.customer.update({
    where: { id: customerId },
    data: { walletBalanceAed: { increment: amountAed } },
  });
}

export async function creditReferral(customerId: string) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer?.referredById || customer.referredById === customer.id) return;
  const already = await prisma.walletEntry.findFirst({ where: { customerId, reason: "referral" } });
  if (already) return;
  const rides = await prisma.booking.count({ where: { customerId, status: { not: "cancelled" } } });
  if (rides !== 1) return;
  const referrer = await prisma.customer.findUnique({ where: { id: customer.referredById } });
  if (!referrer || referrer.status === "deleted") return;
  await addWallet(customerId, REFERRAL_AED, "referral");
  await addWallet(referrer.id, REFERRAL_AED, "referral-invite");
}

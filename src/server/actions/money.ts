"use server";

import { redirect } from "next/navigation";
import { requireRider } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { nid } from "@/lib/ids";
import { addWallet } from "@/server/wallet";

export async function topUpWallet(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const customer = await requireRider(locale);
  const amount = Math.round(Number(formData.get("amount") || 0));
  const card = String(formData.get("card") || "").replace(/\s/g, "");
  if (amount < 10 || amount > 500) redirect(`/${locale}/ride/wallet?error=missing`);
  if (!card.startsWith("4242424242424242")) redirect(`/${locale}/ride/wallet?error=card`);
  await addWallet(customer.id, amount, "topup");
  redirect(`/${locale}/ride/wallet?ok=wallet`);
}

export async function setWhatsApp(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const customer = await requireRider(locale);
  const on = String(formData.get("whatsapp") || "") === "yes";
  await prisma.customer.update({ where: { id: customer.id }, data: { whatsappOptIn: on } });
  redirect(`/${locale}/ride/settings?ok=saved`);
}

export async function payFromWallet(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const customer = await requireRider(locale);
  const bookingId = String(formData.get("bookingId") || "");
  const booking = await prisma.booking.findFirst({ where: { id: bookingId, customerId: customer.id } });
  if (!booking || booking.status === "cancelled") redirect(`/${locale}/ride?error=missing`);
  const due = booking.priceAed - booking.walletPaidAed;
  if (due <= 0) redirect(`/${locale}/ride/trip/${booking.id}?ok=paid`);
  const fresh = await prisma.customer.findUnique({ where: { id: customer.id } });
  if (!fresh || fresh.walletBalanceAed < due) redirect(`/${locale}/ride/trip/${booking.id}?error=wallet`);
  await addWallet(customer.id, -due, "fare", booking.id);
  await prisma.booking.update({ where: { id: booking.id }, data: { walletPaidAed: { increment: due } } });
  redirect(`/${locale}/ride/trip/${booking.id}?ok=paid`);
}

export async function offerSplit(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const customer = await requireRider(locale);
  const bookingId = String(formData.get("bookingId") || "");
  const toCustomerId = String(formData.get("toCustomerId") || "");
  const amount = Math.round(Number(formData.get("amount") || 0));
  const booking = await prisma.booking.findFirst({ where: { id: bookingId, customerId: customer.id } });
  if (!booking?.runId || amount < 1 || toCustomerId === customer.id) redirect(`/${locale}/ride?error=split`);
  const other = await prisma.booking.findFirst({
    where: { runId: booking.runId, customerId: toCustomerId, status: { not: "cancelled" } },
  });
  if (!other) redirect(`/${locale}/ride/trip/${booking.id}?error=split`);
  const pending = await prisma.fareSplit.aggregate({
    where: { bookingId: booking.id, status: "offered" },
    _sum: { amountAed: true },
  });
  if (amount + (pending._sum.amountAed ?? 0) >= booking.priceAed) redirect(`/${locale}/ride/trip/${booking.id}?error=split`);
  await prisma.fareSplit.create({
    data: {
      id: nid("spl"),
      bookingId: booking.id,
      runId: booking.runId,
      fromCustomerId: customer.id,
      toCustomerId,
      amountAed: amount,
      status: "offered",
    },
  });
  redirect(`/${locale}/ride/trip/${booking.id}?ok=split`);
}

export async function answerSplit(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const customer = await requireRider(locale);
  const splitId = String(formData.get("splitId") || "");
  const yes = String(formData.get("answer") || "") === "yes";
  const split = await prisma.fareSplit.findFirst({ where: { id: splitId, toCustomerId: customer.id, status: "offered" } });
  if (!split) redirect(`/${locale}/ride?error=missing`);
  const mine = await prisma.booking.findFirst({
    where: { runId: split.runId, customerId: customer.id, status: { not: "cancelled" } },
  });
  if (!mine) redirect(`/${locale}/ride?error=missing`);
  if (!yes) {
    await prisma.fareSplit.update({ where: { id: split.id }, data: { status: "declined" } });
    redirect(`/${locale}/ride/trip/${mine.id}?ok=saved`);
  }
  const theirs = await prisma.booking.findUnique({ where: { id: split.bookingId } });
  if (!theirs || theirs.priceAed - split.amountAed < 1) {
    await prisma.fareSplit.update({ where: { id: split.id }, data: { status: "declined" } });
    redirect(`/${locale}/ride/trip/${mine.id}?error=split`);
  }
  await prisma.booking.update({ where: { id: theirs.id }, data: { priceAed: { decrement: split.amountAed } } });
  await prisma.booking.update({ where: { id: mine.id }, data: { priceAed: { increment: split.amountAed } } });
  await prisma.fareSplit.update({ where: { id: split.id }, data: { status: "accepted" } });
  redirect(`/${locale}/ride/trip/${mine.id}?ok=split`);
}

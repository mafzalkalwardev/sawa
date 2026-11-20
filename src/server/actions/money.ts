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
  let result: { kind: "missing" } | { kind: "short" | "paid"; id: string };
  try {
    result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({ where: { id: bookingId, customerId: customer.id } });
      if (!booking || booking.status === "cancelled") return { kind: "missing" };
      const due = booking.priceAed - booking.walletPaidAed;
      if (due <= 0) return { kind: "paid", id: booking.id };
      const taken = await tx.customer.updateMany({
        where: { id: customer.id, walletBalanceAed: { gte: due } },
        data: { walletBalanceAed: { decrement: due } },
      });
      if (taken.count !== 1) return { kind: "short", id: booking.id };
      const marked = await tx.booking.updateMany({
        where: { id: booking.id, walletPaidAed: booking.walletPaidAed },
        data: { walletPaidAed: { increment: due } },
      });
      if (marked.count !== 1) throw new Error("paid");
      await tx.walletEntry.create({
        data: { id: nid("wal"), customerId: customer.id, amountAed: -due, reason: "fare", bookingId: booking.id },
      });
      return { kind: "paid", id: booking.id };
    });
  } catch {
    redirect(`/${locale}/ride/trip/${bookingId}?error=wallet`);
  }
  if (result.kind === "missing") redirect(`/${locale}/ride?error=missing`);
  if (result.kind === "short") redirect(`/${locale}/ride/trip/${result.id}?error=wallet`);
  redirect(`/${locale}/ride/trip/${result.id}?ok=paid`);
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
    await prisma.fareSplit.updateMany({ where: { id: split.id, status: "offered" }, data: { status: "declined" } });
    redirect(`/${locale}/ride/trip/${mine.id}?ok=saved`);
  }
  let outcome: "ok" | "bad" = "ok";
  try {
    outcome = await prisma.$transaction(async (tx) => {
      const claimed = await tx.fareSplit.updateMany({
        where: { id: split.id, status: "offered" },
        data: { status: "accepted" },
      });
      if (claimed.count !== 1) return "ok";
      const theirs = await tx.booking.findUnique({ where: { id: split.bookingId } });
      const mineFresh = await tx.booking.findUnique({ where: { id: mine.id } });
      if (!theirs || !mineFresh || theirs.status === "cancelled" || theirs.priceAed - split.amountAed < 1) {
        await tx.fareSplit.update({ where: { id: split.id }, data: { status: "declined" } });
        return "bad";
      }
      const nextPrice = theirs.priceAed - split.amountAed;
      const refund = Math.max(0, theirs.walletPaidAed - nextPrice);
      await tx.booking.update({
        where: { id: theirs.id },
        data: { priceAed: nextPrice, walletPaidAed: theirs.walletPaidAed - refund },
      });
      await tx.booking.update({
        where: { id: mineFresh.id },
        data: { priceAed: { increment: split.amountAed } },
      });
      if (refund > 0) {
        await tx.walletEntry.create({
          data: { id: nid("wal"), customerId: theirs.customerId, amountAed: refund, reason: "split", bookingId: theirs.id },
        });
        await tx.customer.update({
          where: { id: theirs.customerId },
          data: { walletBalanceAed: { increment: refund } },
        });
      }
      return "ok";
    });
  } catch {
    redirect(`/${locale}/ride/trip/${mine.id}?error=split`);
  }
  redirect(`/${locale}/ride/trip/${mine.id}?${outcome === "bad" ? "error=split" : "ok=split"}`);
}

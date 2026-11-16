import Link from "next/link";
import { Notice } from "@/components/notice";
import { requireRider } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { topUpWallet } from "@/server/actions/money";

export default async function WalletPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const customer = await requireRider(locale);
  const entries = await prisma.walletEntry.findMany({ where: { customerId: customer.id }, orderBy: { createdAt: "desc" }, take: 20 });
  const ar = locale === "ar";
  const reason = (value: string) => {
    if (value === "topup") return ar ? "إضافة" : "Top up";
    if (value === "fare") return ar ? "أجرة" : "Fare";
    if (value === "referral") return ar ? "رمز دعوة" : "Referral";
    if (value === "referral-invite") return ar ? "صديق انضم" : "A friend joined";
    return value;
  };
  return (
    <>
      <h1>{ar ? "المحفظة" : "Wallet"}</h1>
      <p className="price">{customer.walletBalanceAed} AED</p>
      <p className="muted">{ar ? "الرصيد يبقى على حسابك ويُستخدم لأجرة رحلة. الإضافة تستخدم البطاقة التجريبية 4242." : "The balance stays on your account and can pay a fare. Adding money uses the test card 4242."}</p>
      <Notice locale={locale} ok={query.ok} code={query.error} />
      <form className="stack" action={topUpWallet}>
        <input type="hidden" name="locale" value={locale} />
        <label>{ar ? "المبلغ" : "Amount"}
          <select name="amount" defaultValue="50">
            <option value="20">20 AED</option>
            <option value="50">50 AED</option>
            <option value="100">100 AED</option>
          </select>
        </label>
        <label>{ar ? "رقم البطاقة" : "Card number"}<input name="card" inputMode="numeric" autoComplete="cc-number" placeholder="4242 4242 4242 4242" required /></label>
        <button className="btn" type="submit">{ar ? "أضف إلى المحفظة" : "Add to the wallet"}</button>
      </form>
      <h2>{ar ? "الحركات" : "Entries"}</h2>
      {entries.length === 0 ? <p className="card">{ar ? "لا توجد حركة بعد." : "No entry yet."}</p> : null}
      {entries.map((entry) => (
        <p key={entry.id}>{reason(entry.reason)} · {entry.amountAed > 0 ? "+" : ""}{entry.amountAed} AED</p>
      ))}
      <p><Link href={`/${locale}/ride/settings`}>{ar ? "الحساب" : "Account"}</Link></p>
    </>
  );
}

import Link from "next/link";
import { cookies } from "next/headers";
import { Notice } from "@/components/notice";
import { t } from "@/i18n/copy";
import { requireRider } from "@/lib/auth";
import { logout } from "@/server/actions/auth";
import { deleteAccount, setLargeType } from "@/server/actions/rider";
import { setWhatsApp } from "@/server/actions/money";
import { ensureReferralCode, REFERRAL_AED } from "@/server/wallet";

export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const customer = await requireRider(locale);
  const code = await ensureReferralCode(customer.id);
  const large = (await cookies()).get("sawa_large")?.value === "1";
  const m = t(locale);
  const ar = locale === "ar";
  return (
    <>
      <h1>{m.account}</h1>
      <Notice locale={locale} ok={query.ok} code={query.error} />
      <p>{customer.fullName}</p>
      <p className="card">{ar ? "رمزك" : "Your code"} <strong>{code}</strong><br /><span className="muted">{ar ? `الصديق يحصل على ${REFERRAL_AED} درهم عند أول رحلة، وأنت أيضًا.` : `A friend gets AED ${REFERRAL_AED} on their first ride, and so do you.`}</span></p>
      <p><Link className="btn" href={`/${locale}/ride/wallet`}>{ar ? `المحفظة · ${customer.walletBalanceAed} درهم` : `Wallet · AED ${customer.walletBalanceAed}`}</Link></p>
      <form action={setWhatsApp}>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="whatsapp" value={customer.whatsappOptIn ? "no" : "yes"} />
        <button className="btn ghost" type="submit">{customer.whatsappOptIn ? (ar ? "إيقاف رسائل واتساب" : "Stop WhatsApp messages") : (ar ? "أريد رسائل واتساب" : "I want WhatsApp messages")}</button>
      </form>
      <p><Link href={`/${locale}/ride/profile`}>{ar ? "تعديل الملف" : "Edit profile"}</Link></p>
      <p><Link href={`/${locale === "ar" ? "en" : "ar"}/ride/settings`}>{m.language}</Link></p>
      <form action={setLargeType}>
        <input type="hidden" name="locale" value={locale} />
        <button className="btn ghost" type="submit">{m.largeType}: {large ? (ar ? "تشغيل" : "On") : (ar ? "إيقاف" : "Off")}</button>
      </form>
      <form action={logout}>
        <input type="hidden" name="next" value={`/${locale}/app`} />
        <button className="btn ghost" type="submit">{m.logout}</button>
      </form>
      <p className="muted">{m.locationDisclosure}</p>
      <p><Link href={`/${locale}/privacy`}>{m.privacy}</Link> · <Link href={`/${locale}/terms`}>{m.terms}</Link></p>
      <form className="card stack" action={deleteAccount}>
        <input type="hidden" name="locale" value={locale} />
        <h2>{m.delete}</h2>
        <label>{ar ? "اكتب DELETE" : "Type DELETE"}<input name="confirm" required /></label>
        <button className="btn danger" type="submit">{m.delete}</button>
      </form>
    </>
  );
}

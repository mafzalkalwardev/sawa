import Link from "next/link";
import { cookies } from "next/headers";
import { Notice } from "@/components/notice";
import { t } from "@/i18n/copy";
import { requireRider } from "@/lib/auth";
import { deleteAccount, setLargeType } from "@/server/actions/rider";

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
  const large = (await cookies()).get("sawa_large")?.value === "1";
  const m = t(locale);
  const ar = locale === "ar";
  return (
    <>
      <h1>{m.account}</h1>
      <Notice locale={locale} ok={query.ok} code={query.error} />
      <p>{customer.fullName}</p>
      <p><Link href={`/${locale}/ride/profile`}>{ar ? "تعديل الملف" : "Edit profile"}</Link></p>
      <p><Link href={`/${locale === "ar" ? "en" : "ar"}/ride/settings`}>{m.language}</Link></p>
      <form action={setLargeType}>
        <input type="hidden" name="locale" value={locale} />
        <button className="btn ghost" type="submit">{m.largeType}: {large ? (ar ? "تشغيل" : "On") : (ar ? "إيقاف" : "Off")}</button>
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

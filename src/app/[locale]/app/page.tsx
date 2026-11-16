import Link from "next/link";
import { redirect } from "next/navigation";
import { otherLocale } from "@/i18n/locale";
import { t } from "@/i18n/copy";
import { getSession } from "@/lib/auth";

export default async function AppHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await getSession();
  if (session?.kind === "rider") redirect(`/${locale}/ride`);
  if (session?.kind === "driver") redirect(`/${locale}/drive`);
  if (session?.kind === "staff") redirect(`/${locale}/ops`);
  const m = t(locale);
  const ar = locale === "ar";
  return (
    <div className="phone">
      <header className="app-top">
        <div>
          <p className="app-mark">{m.brand}</p>
          <p className="app-sub">{ar ? "تنقّل يومي" : "Daily commute"}</p>
        </div>
        <Link className="lang" href={`/${otherLocale(locale)}/app`}>{m.language}</Link>
      </header>
      <main>
        <h1>{ar ? "حسابان منفصلان" : "Two separate accounts"}</h1>
        <div className="stack" style={{ marginTop: 18 }}>
          <a className="choice" href={`/${locale}/ride/signup`}>
            <span><strong>{ar ? "راكب" : "Passenger"}</strong><span>{ar ? "صورة وهوية، ثم طلب رحلة يوم أو شهر" : "Photo and Emirates ID, then a one-day or monthly ride"}</span></span>
            <strong>→</strong>
          </a>
          <a className="choice" href={`/${locale}/drive/signup`}>
            <span><strong>{ar ? "سائق" : "Driver"}</strong><span>{ar ? "اسم وممر، ثم أوراق المركبة" : "Name and corridor, then the vehicle papers"}</span></span>
            <strong>→</strong>
          </a>
        </div>
        <p className="muted" style={{ marginTop: 18 }}>{ar ? "لديك حساب؟" : "Already have an account?"}</p>
        <div className="pair">
          <a className="btn ghost" href={`/${locale}/ride/login`}>{ar ? "دخول راكب" : "Passenger"}</a>
          <a className="btn ghost" href={`/${locale}/drive/login`}>{ar ? "دخول سائق" : "Driver"}</a>
        </div>
      </main>
    </div>
  );
}

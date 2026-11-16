import Link from "next/link";
import { redirect } from "next/navigation";
import { Notice } from "@/components/notice";
import { t } from "@/i18n/copy";
import { getSession } from "@/lib/auth";
import { requestOtp } from "@/server/actions/auth";

export default async function RideLogin({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sent?: string; phone?: string; error?: string; next?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const next = typeof query.next === "string" && query.next.startsWith(`/${locale}/`) ? query.next : "";
  const session = await getSession();
  if (session?.kind === "rider") redirect(`/${locale}/ride`);
  const m = t(locale);
  return (
    <div className="phone">
      <header className="app-top">
        <div>
          <Link href={`/${locale}/app`} className="app-mark">{m.brand}</Link>
          <p className="app-sub">{locale === "ar" ? "تنقّل يومي" : "Daily commute"}</p>
        </div>
        <Link className="lang" href={`/${locale === "ar" ? "en" : "ar"}/ride/login`}>{m.language}</Link>
      </header>
      <main>
        <h1>{locale === "ar" ? "دخول الراكب" : "Passenger sign in"}</h1>
        <p className="muted">{locale === "ar" ? "نفس الرقم الذي أنشأت به حساب الراكب." : "The number you used to create your passenger account."}</p>
        <Notice locale={locale} code={query.error} />
        <form className="stack" action={requestOtp}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="mode" value="rider" />
          {next ? <input type="hidden" name="next" value={next} /> : null}
          <label>{m.phone}<input name="phone" inputMode="tel" placeholder="050 100 0001" required /></label>
          <button className="btn" type="submit">{locale === "ar" ? "دخول" : "Sign in"}</button>
        </form>
        <p className="muted"><Link href={`/${locale}/ride/signup`}>{locale === "ar" ? "حساب راكب جديد" : "Create a passenger account"}</Link></p>
        <p className="muted"><Link href={`/${locale}/drive/login`}>{locale === "ar" ? "دخول السائق" : "Driver sign in"}</Link></p>
      </main>
    </div>
  );
}

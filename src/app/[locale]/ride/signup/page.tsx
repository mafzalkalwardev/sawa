import Link from "next/link";
import { redirect } from "next/navigation";
import { Notice } from "@/components/notice";
import { t } from "@/i18n/copy";
import { getSession } from "@/lib/auth";
import { joinRider } from "@/server/actions/auth";

export default async function RideSignup({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  if ((await getSession())?.kind === "rider") redirect(`/${locale}/ride`);
  const m = t(locale);
  const ar = locale === "ar";
  return (
    <div className="phone">
      <header className="app-top">
        <div>
          <Link href={`/${locale}/app`} className="app-mark">{m.brand}</Link>
          <p className="app-sub">{ar ? "حساب راكب" : "Passenger account"}</p>
        </div>
        <Link className="lang" href={`/${ar ? "en" : "ar"}/ride/signup`}>{m.language}</Link>
      </header>
      <main>
        <h1>{ar ? "إنشاء حساب راكب" : "Create a passenger account"}</h1>
        <p className="muted">{ar ? "رقم هاتفك، ثم صورتك وهويتك." : "Your phone number, then your photo and Emirates ID."}</p>
        <Notice locale={locale} code={query.error} />
        <form className="stack" action={joinRider}>
          <input type="hidden" name="locale" value={locale} />
          <label>{m.phone}<input name="phone" inputMode="tel" autoComplete="tel" placeholder="050 000 0000" required /></label>
          <button className="btn" type="submit">{ar ? "إنشاء الحساب" : "Create account"}</button>
        </form>
        <p className="muted"><Link href={`/${locale}/ride/login`}>{ar ? "لديك حساب؟ دخول الراكب" : "Already a passenger? Sign in"}</Link></p>
        <p className="muted"><Link href={`/${locale}/drive/signup`}>{ar ? "تريد القيادة؟ حساب سائق" : "Want to drive? Driver account"}</Link></p>
      </main>
    </div>
  );
}

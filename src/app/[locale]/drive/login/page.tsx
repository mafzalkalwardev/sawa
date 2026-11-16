import Link from "next/link";
import { redirect } from "next/navigation";
import { Notice } from "@/components/notice";
import { t } from "@/i18n/copy";
import { getSession } from "@/lib/auth";
import { requestOtp } from "@/server/actions/auth";

export default async function DriveLogin({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sent?: string; phone?: string; error?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  if ((await getSession())?.kind === "driver") redirect(`/${locale}/drive`);
  const m = t(locale);
  const ar = locale === "ar";
  return (
    <div className="phone">
      <header className="app-top">
        <div>
          <Link href={`/${locale}/app`} className="app-mark">{m.brand}</Link>
          <p className="app-sub">{ar ? "تنقّل يومي" : "Daily commute"}</p>
        </div>
        <Link className="lang" href={`/${ar ? "en" : "ar"}/drive/login`}>{m.language}</Link>
      </header>
      <main>
        <h1>{ar ? "دخول السائق" : "Driver sign in"}</h1>
        <p className="muted">{ar ? "الرقم الذي قدّمت به للقيادة." : "The number you used to apply to drive."}</p>
        <Notice locale={locale} code={query.error} />
        <form className="stack" action={requestOtp}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="mode" value="driver" />
          <label>{m.phone}<input name="phone" placeholder="050 100 0002" required /></label>
          <button className="btn" type="submit">{ar ? "دخول" : "Sign in"}</button>
        </form>
        <p className="muted"><Link href={`/${locale}/drive/signup`}>{ar ? "التقديم للقيادة" : "Apply to drive"}</Link></p>
        <p className="muted"><Link href={`/${locale}/ride/login`}>{ar ? "دخول الراكب" : "Passenger sign in"}</Link></p>
      </main>
    </div>
  );
}

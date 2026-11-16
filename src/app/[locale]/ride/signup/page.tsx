import Link from "next/link";
import { redirect } from "next/navigation";
import { Notice } from "@/components/notice";
import { t } from "@/i18n/copy";
import { getSession } from "@/lib/auth";
import { joinRider } from "@/server/actions/auth";
import { Steps, passengerSteps } from "@/components/steps";

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
        <Steps labels={passengerSteps(ar)} current={1} />
        <h1>{ar ? "ما رقم جوالك؟" : "What's your mobile number?"}</h1>
        <p className="muted">{ar ? "بعدها نطلب صورتك وهويتك." : "Next we ask for your photo and Emirates ID."}</p>
        <Notice locale={locale} code={query.error} />
        <form className="stack" action={joinRider}>
          <input type="hidden" name="locale" value={locale} />
          <label>{m.phone}<input name="phone" inputMode="tel" autoComplete="tel" placeholder="050 000 0000" required /></label>
          <label>{ar ? "رمز صديق، إن وُجد" : "A friend's code, if you have one"}<input name="referral" autoCapitalize="characters" placeholder="AB12CD" /></label>
          <button className="btn" type="submit">{ar ? "متابعة" : "Continue"}</button>
        </form>
        <p className="muted"><Link href={`/${locale}/ride/login`}>{ar ? "لديك حساب؟ دخول الراكب" : "Already a passenger? Sign in"}</Link></p>
        <p className="muted"><Link href={`/${locale}/drive/signup`}>{ar ? "تريد القيادة؟ حساب سائق" : "Want to drive? Driver account"}</Link></p>
      </main>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { Notice } from "@/components/notice";
import { t } from "@/i18n/copy";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { joinDriver } from "@/server/actions/auth";
import { Steps, driverSteps } from "@/components/steps";

export default async function DriveSignup({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  if ((await getSession())?.kind === "driver") redirect(`/${locale}/drive`);
  const routes = await prisma.route.findMany({ where: { active: true }, orderBy: { nameEn: "asc" } });
  const m = t(locale);
  const ar = locale === "ar";
  return (
    <div className="phone">
      <header className="app-top">
        <div>
          <Link href={`/${locale}/app`} className="app-mark">{m.brand}</Link>
          <p className="app-sub">{ar ? "حساب سائق" : "Driver account"}</p>
        </div>
        <Link className="lang" href={`/${ar ? "en" : "ar"}/drive/signup`}>{m.language}</Link>
      </header>
      <main>
        <Steps labels={driverSteps(ar)} current={1} />
        <h1>{ar ? "من أنت؟" : "Who are you?"}</h1>
        <p className="muted">{ar ? "استخدم رقمًا مختلفًا عن حساب الراكب. بعدها ترفع أوراق المركبة." : "Use a different number from a passenger account. Next you upload the van papers."}</p>
        <Notice locale={locale} code={query.error} />
        <form className="stack" action={joinDriver}>
          <input type="hidden" name="locale" value={locale} />
          <label>{m.name}<input name="fullName" autoComplete="name" required /></label>
          <label>{m.phone}<input name="phone" inputMode="tel" autoComplete="tel" placeholder="050 000 0000" required /></label>
          <label>{m.otp}<input name="code" inputMode="numeric" autoComplete="one-time-code" placeholder="123456" required /></label>
          <label>{ar ? "أي طريق تقود؟" : "Which road do you drive?"}
            <select name="routeSlug" required defaultValue={routes[0]?.slug ?? ""}>
              {routes.map((route) => <option key={route.id} value={route.slug}>{ar ? route.nameAr : route.nameEn}</option>)}
            </select>
          </label>
          <button className="btn" type="submit">{ar ? "متابعة" : "Continue"}</button>
        </form>
        <p className="muted"><Link href={`/${locale}/drive/login`}>{ar ? "لديك حساب؟ دخول السائق" : "Already a driver? Sign in"}</Link></p>
        <p className="muted"><Link href={`/${locale}/ride/signup`}>{ar ? "تريد مقعدًا؟ حساب راكب" : "Need a seat? Passenger account"}</Link></p>
      </main>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { Notice } from "@/components/notice";
import { t } from "@/i18n/copy";
import { getSession } from "@/lib/auth";
import { requestOtp, verifyOtp } from "@/server/actions/auth";

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
      <main className="section">
        <h1>{ar ? "دخول السائق" : "Driver sign in"}</h1>
        <p className="muted">{m.demoHint}</p>
        <Notice locale={locale} code={query.error} />
        {query.sent ? (
          <form className="stack" action={verifyOtp}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="mode" value="driver" />
            <input type="hidden" name="phone" value={query.phone || ""} />
            <label>{m.otp}<input name="code" inputMode="numeric" required /></label>
            <button className="btn" type="submit">{m.verify}</button>
          </form>
        ) : (
          <form className="stack" action={requestOtp}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="mode" value="driver" />
            <label>{m.phone}<input name="phone" placeholder="050 100 0002" required /></label>
            <button className="btn" type="submit">{m.sendCode}</button>
          </form>
        )}
        <p><Link href={`/${locale}/ride/login`}>{m.bookSeat}</Link></p>
      </main>
    </div>
  );
}

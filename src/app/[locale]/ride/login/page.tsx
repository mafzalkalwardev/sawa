import Link from "next/link";
import { redirect } from "next/navigation";
import { Notice } from "@/components/notice";
import { t } from "@/i18n/copy";
import { getSession } from "@/lib/auth";
import { requestOtp, verifyOtp } from "@/server/actions/auth";

export default async function RideLogin({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sent?: string; phone?: string; error?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const session = await getSession();
  if (session?.kind === "rider") redirect(`/${locale}/ride`);
  const m = t(locale);
  return (
    <div className="phone">
      <main className="section">
        <p className="eyebrow">Sawa</p>
        <h1>{m.bookSeat}</h1>
        <p className="muted">{m.demoHint}</p>
        <Notice locale={locale} code={query.error} />
        {query.sent ? (
          <form className="stack" action={verifyOtp}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="mode" value="rider" />
            <input type="hidden" name="phone" value={query.phone || ""} />
            <label>{m.otp}<input name="code" inputMode="numeric" autoComplete="one-time-code" required /></label>
            <button className="btn" type="submit">{m.verify}</button>
          </form>
        ) : (
          <form className="stack" action={requestOtp}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="mode" value="rider" />
            <label>{m.phone}<input name="phone" inputMode="tel" placeholder="050 100 0001" required /></label>
            <button className="btn" type="submit">{m.sendCode}</button>
          </form>
        )}
        <p><Link href={`/${locale}/drive/login`}>{m.driveApp}</Link></p>
      </main>
    </div>
  );
}

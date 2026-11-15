import { redirect } from "next/navigation";
import { Notice } from "@/components/notice";
import { t } from "@/i18n/copy";
import { getSession } from "@/lib/auth";
import { staffLogin } from "@/server/actions/auth";

export default async function OpsLogin({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  if ((await getSession())?.kind === "staff") redirect(`/${locale}/ops`);
  const m = t(locale);
  return (
    <main className="wrap section">
      <h1>{m.staffLogin}</h1>
      <p className="muted">ops@sawa.test · sawa-demo</p>
      <Notice locale={locale} code={query.error} />
      <form className="card stack" action={staffLogin}>
        <input type="hidden" name="locale" value={locale} />
        <label>{m.email}<input name="email" type="email" autoComplete="username" required /></label>
        <label>{m.password}<input name="password" type="password" autoComplete="current-password" required /></label>
        <button className="btn" type="submit">{m.verify}</button>
      </form>
    </main>
  );
}

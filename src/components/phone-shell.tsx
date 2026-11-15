import Link from "next/link";
import { headers } from "next/headers";
import { otherLocale, swapLocale } from "@/i18n/locale";
import { t } from "@/i18n/copy";
import { logout } from "@/server/actions/auth";

const rider = [
  ["", "home"],
  ["/book", "book"],
  ["/passes", "passes"],
  ["/help", "help"],
  ["/settings", "account"],
] as const;

const driver = [
  ["", "today"],
  ["/documents", "papers"],
  ["/history", "history"],
] as const;

export async function PhoneShell({
  locale,
  mode,
  children,
}: {
  locale: string;
  mode: "ride" | "drive";
  children: React.ReactNode;
}) {
  const m = t(locale);
  const path = (await headers()).get("x-pathname") || `/${locale}/${mode}`;
  const alt = swapLocale(path, otherLocale(locale));
  const items = mode === "ride" ? rider : driver;
  return (
    <div className="phone">
      <div className="banner">{m.demo}</div>
      <header className="app-header">
        <Link href={`/${locale}`} className="brand">{m.brand}</Link>
        <Link href={alt}>{m.language}</Link>
      </header>
      <main id="main">{children}</main>
      <nav className="bottom-nav" aria-label={mode}>
        {items.map(([href, key]) => {
          const full = `/${locale}/${mode}${href}`;
          const current = path === full || (href === "" && (path === full || path === `${full}/`));
          return (
            <Link key={key} href={full} aria-current={current ? "page" : undefined}>
              {m[key]}
            </Link>
          );
        })}
        <form action={logout}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="next" value={`/${locale}/${mode}/login`} />
          <button className="btn ghost small" type="submit">{m.logout}</button>
        </form>
      </nav>
    </div>
  );
}

import Link from "next/link";
import { headers } from "next/headers";
import { otherLocale, swapLocale } from "@/i18n/locale";
import { t } from "@/i18n/copy";
import { logout } from "@/server/actions/auth";
import { UpdateNotifier } from "@/components/update-notifier";

const rider = [
  ["", "home", "home"],
  ["/book", "book", "book"],
  ["/chat", "chat", "chat"],
  ["/passes", "passes", "pass"],
  ["/settings", "account", "account"],
] as const;

const driver = [
  ["", "today", "home"],
  ["/chat", "chat", "chat"],
  ["/documents", "papers", "doc"],
  ["/history", "history", "clock"],
] as const;

function Icon({ name }: { name: string }) {
  const common = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, "aria-hidden": true };
  if (name === "book") {
    return <svg {...common}><path d="M5 6.5h10.5A2.5 2.5 0 0 1 18 9v10H8.5A3.5 3.5 0 0 0 5 15.5Z" /><path d="M5 6.5v9" /></svg>;
  }
  if (name === "pass") {
    return <svg {...common}><rect x="4" y="6" width="16" height="12" rx="2" /><path d="M8 10h8M8 14h5" /></svg>;
  }
  if (name === "account") {
    return <svg {...common}><circle cx="12" cy="9" r="3" /><path d="M6.5 18.5a5.5 5.5 0 0 1 11 0" /></svg>;
  }
  if (name === "doc") {
    return <svg {...common}><path d="M7 4.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9.5A1.5 1.5 0 0 1 5.5 19V6A1.5 1.5 0 0 1 7 4.5Z" /><path d="M14 4.5V9h4" /></svg>;
  }
  if (name === "chat") {
    return <svg {...common}><path d="M6 16.5 4.5 20l4-1.5" /><path d="M7 16.5h8.5A3.5 3.5 0 0 0 19 13V8.5A3.5 3.5 0 0 0 15.5 5h-8A3.5 3.5 0 0 0 4 8.5V13a3.5 3.5 0 0 0 3 3.5Z" /></svg>;
  }
  if (name === "clock") {
    return <svg {...common}><circle cx="12" cy="12" r="7.5" /><path d="M12 8.5V12l2.5 2" /></svg>;
  }
  return <svg {...common}><path d="M5 11.5 12 5l7 6.5" /><path d="M7.5 10.5V19h9v-8.5" /></svg>;
}

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
      <header className="app-top">
        <div>
          <Link href={`/${locale}/app`} className="app-mark">{m.brand}</Link>
          <p className="app-sub">{locale === "ar" ? "تنقّل يومي" : "Daily commute"}</p>
        </div>
        <div className="app-tools">
          <Link className="lang" href={alt}>{m.language}</Link>
          {mode === "drive" ? (
            <form action={logout}>
              <input type="hidden" name="next" value={`/${locale}/app`} />
              <button className="lang" type="submit">{m.logout}</button>
            </form>
          ) : null}
        </div>
      </header>
      <UpdateNotifier locale={locale} />
      <main id="main">{children}</main>
      <nav className={`bottom-nav cols-${items.length}`} aria-label={mode}>
        {items.map(([href, key, icon]) => {
          const full = `/${locale}/${mode}${href}`;
          const current = path === full || path === `${full}/`;
          return (
            <Link key={key} className="tab" href={full} aria-current={current ? "page" : undefined}>
              <Icon name={icon} />
              {m[key]}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

import Link from "next/link";
import { t } from "@/i18n/copy";
import { logout } from "@/server/actions/auth";

const links = [
  ["", "dashboard"],
  ["/plan", "plan"],
  ["/trips", "trips"],
  ["/drivers", "drivers"],
  ["/customers", "customers"],
  ["/vehicles", "vehicles"],
  ["/routes", "routes"],
  ["/tickets", "tickets"],
  ["/billing", "billing"],
  ["/payouts", "payouts"],
  ["/reports", "reports"],
  ["/import", "import"],
  ["/employers", "employers"],
  ["/settings", "settings"],
  ["/audit", "audit"],
] as const;

export function OpsShell({ locale, role, children }: { locale: string; role: string; children: React.ReactNode }) {
  const m = t(locale);
  return (
    <div className="ops">
      <nav aria-label="Staff">
        <Link href={`/${locale}`} className="brand">{m.brand}</Link>
        <span className="tag">{role}</span>
        {links.map(([href, key]) => (
          <Link key={key} href={`/${locale}/ops${href}`}>{m[key]}</Link>
        ))}
        <form action={logout}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="next" value={`/${locale}/ops/login`} />
          <button className="btn ghost small" type="submit">{m.logout}</button>
        </form>
      </nav>
      <div className="ops-main">
        <div className="banner">{m.demo}</div>
        <main id="main">{children}</main>
      </div>
    </div>
  );
}

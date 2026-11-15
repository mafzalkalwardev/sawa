import Link from "next/link";
import { headers } from "next/headers";
import { otherLocale, swapLocale } from "@/i18n/locale";
import { t } from "@/i18n/copy";

export async function MarketingShell({ locale, children }: { locale: string; children: React.ReactNode }) {
  const m = t(locale);
  const path = (await headers()).get("x-pathname") || `/${locale}`;
  const alt = swapLocale(path, otherLocale(locale));
  return (
    <>
      <a className="skip" href="#main">{locale === "ar" ? "تخطي إلى المحتوى" : "Skip to content"}</a>
      <div className="banner">{m.demo}</div>
      <div className="wrap">
        <header className="site-header">
          <Link className="brand" href={`/${locale}`}>{m.brand}</Link>
          <nav className="nav" aria-label="Primary">
            <Link href={`/${locale}/how-it-works`}>{m.how}</Link>
            <Link href={`/${locale}/corridors`}>{m.corridors}</Link>
            <Link href={`/${locale}/safety`}>{m.safety}</Link>
            <Link href={`/${locale}/employers`}>{m.employers}</Link>
            <Link href={`/${locale}/pricing`}>{m.pricing}</Link>
            <Link href={`/${locale}/faq`}>{m.faq}</Link>
            <Link href={`/${locale}/contact`}>{m.contact}</Link>
            <Link href={alt}>{m.language}</Link>
            <Link className="btn small" href={`/${locale}/ride/book`}>{m.bookSeat}</Link>
          </nav>
        </header>
        <main id="main">{children}</main>
        <footer className="site-footer">
          <div>
            <strong>{m.brand}</strong>
            <p className="muted">{m.demo}</p>
          </div>
          <nav className="nav">
            <Link href={`/${locale}/privacy`}>{m.privacy}</Link>
            <Link href={`/${locale}/terms`}>{m.terms}</Link>
            <Link href={`/${locale}/drive/login`}>{m.driveApp}</Link>
            <Link href={`/${locale}/ops/login`}>{m.staffLogin}</Link>
          </nav>
        </footer>
      </div>
    </>
  );
}

import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { OpsShell } from "@/components/ops-shell";
import { isLocale } from "@/i18n/locale";
import { requireStaff } from "@/lib/auth";

export const metadata = { robots: { index: false, follow: false } };

export default async function OpsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const path = (await headers()).get("x-pathname") || "";
  if (path.endsWith("/login")) return children;
  const staff = await requireStaff(locale);
  return <OpsShell locale={locale} role={staff.role}>{children}</OpsShell>;
}

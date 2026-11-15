import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { PhoneShell } from "@/components/phone-shell";
import { isLocale } from "@/i18n/locale";
import { requireDriver } from "@/lib/auth";

export const metadata = { robots: { index: false, follow: false } };

export default async function DriveLayout({
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
  await requireDriver(locale);
  return <PhoneShell locale={locale} mode="drive">{children}</PhoneShell>;
}

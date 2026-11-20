import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { PhoneShell } from "@/components/phone-shell";
import { isLocale } from "@/i18n/locale";
import { requireRider } from "@/lib/auth";

export const metadata = { robots: { index: false, follow: false } };

export default async function RideLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const path = (await headers()).get("x-pathname") || "";
  if (path.endsWith("/login") || path.endsWith("/signup")) return children;
  const customer = await requireRider(locale);
  if ((!customer.fullName || !customer.photoUrl || !customer.idDocumentUrl) && !path.endsWith("/profile")) redirect(`/${locale}/ride/profile`);
  return (
    <PhoneShell locale={locale} mode="ride">
      {children}
    </PhoneShell>
  );
}

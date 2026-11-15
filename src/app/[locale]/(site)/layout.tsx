import { MarketingShell } from "@/components/marketing-shell";

export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <MarketingShell locale={locale}>{children}</MarketingShell>;
}

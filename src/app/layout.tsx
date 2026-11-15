import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Sans, IBM_Plex_Sans_Arabic } from "next/font/google";
import { cookies, headers } from "next/headers";
import "./globals.css";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display" });
const sans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-sans" });
const arabic = IBM_Plex_Sans_Arabic({ subsets: ["arabic"], weight: ["400", "500", "600"], variable: "--font-arabic" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000"),
  title: { default: "Sawa", template: "%s · Sawa" },
  description: "Sawa books a reserved seat on a licensed shared vehicle for UAE commute corridors. It is not a private-car marketplace.",
  applicationName: "Sawa",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Sawa", statusBarStyle: "black-translucent" },
  other: { google: "notranslate" },
};

export const viewport: Viewport = {
  themeColor: "#0e2a24",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headerStore = await headers();
  const locale = headerStore.get("x-locale") === "ar" ? "ar" : "en";
  const large = (await cookies()).get("sawa_large")?.value === "1";
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} translate="no" data-large={large ? "1" : "0"}>
      <body className={`${display.variable} ${sans.variable} ${arabic.variable}`}>{children}</body>
    </html>
  );
}

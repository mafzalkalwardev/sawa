import type { Metadata } from "next";

export function pageMeta(locale: string, path: string, title: string, description: string): Metadata {
  const suffix = path ? `/${path}` : "";
  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}${suffix}`,
      languages: {
        en: `/en${suffix}`,
        ar: `/ar${suffix}`,
        "x-default": `/en${suffix}`,
      },
    },
    openGraph: {
      title,
      description,
      locale: locale === "ar" ? "ar_AE" : "en_AE",
      type: "website",
    },
  };
}

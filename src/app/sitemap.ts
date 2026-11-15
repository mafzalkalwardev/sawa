import type { MetadataRoute } from "next";
import { network } from "@/content/network";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000";
  const paths = ["", "/how-it-works", "/corridors", "/safety", "/employers", "/pricing", "/faq", "/contact", "/privacy", "/terms"];
  const corridorPaths = network.map((route) => `/corridors/${route.slug}`);
  const all = [...paths, ...corridorPaths];
  return ["en", "ar"].flatMap((locale) =>
    all.map((path) => ({
      url: `${base}/${locale}${path}`,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.7,
      alternates: {
        languages: {
          en: `${base}/en${path}`,
          ar: `${base}/ar${path}`,
        },
      },
    })),
  );
}

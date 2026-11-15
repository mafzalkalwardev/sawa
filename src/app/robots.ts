import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/en/ops", "/ar/ops", "/en/drive", "/ar/drive", "/en/ride", "/ar/ride", "/api"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}

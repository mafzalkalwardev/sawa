import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sawa shared commute",
    short_name: "Sawa",
    description: "Reserved seats on licensed shared vehicles for UAE commute corridors.",
    start_url: "/en/ride",
    scope: "/",
    display: "standalone",
    background_color: "#f3efe6",
    theme_color: "#0e2a24",
    lang: "en",
    dir: "auto",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

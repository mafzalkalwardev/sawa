export function otherLocale(locale: string) {
  return locale === "ar" ? "en" : "ar";
}

export function swapLocale(pathname: string, target: string) {
  if (pathname === "/en" || pathname === "/ar") return `/${target}`;
  if (pathname.startsWith("/en/")) return `/${target}/${pathname.slice(4)}`;
  if (pathname.startsWith("/ar/")) return `/${target}/${pathname.slice(4)}`;
  return `/${target}`;
}

export function isLocale(value: string): value is "en" | "ar" {
  return value === "en" || value === "ar";
}

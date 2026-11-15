import { t } from "@/i18n/copy";

export function Notice({ locale, code, ok }: { locale: string; code?: string; ok?: string }) {
  const m = t(locale);
  if (ok && ok in m.ok) return <p className="alert good">{m.ok[ok as keyof typeof m.ok]}</p>;
  if (code && code in m.errors) return <p className="alert" role="alert">{m.errors[code as keyof typeof m.errors]}</p>;
  if (code) return <p className="alert" role="alert">{code}</p>;
  return null;
}

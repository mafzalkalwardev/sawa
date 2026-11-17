"use client";

import { useEffect } from "react";

export function UpdateNotifier({ locale }: { locale: string }) {
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (navigator.userAgent.includes("; wv")) return;
    const seen = new Set<string>();
    let stop = false;
    async function poll() {
      if (stop || Notification.permission !== "granted") return;
      const response = await fetch("/api/updates/pending");
      if (!response.ok) return;
      const data = await response.json();
      const rows = Array.isArray(data.updates) ? data.updates : [];
      for (const row of rows) {
        if (!row?.id || seen.has(row.id)) continue;
        seen.add(row.id);
        const body = locale === "ar" ? row.ar : row.en;
        if (body) new Notification("Sawa", { body });
      }
    }
    const timer = window.setInterval(() => void poll(), 20000);
    void poll();
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [locale]);
  return null;
}

export function AskPhoneAlert({ locale }: { locale: string }) {
  const ar = locale === "ar";
  return (
    <button
      className="btn ghost"
      type="button"
      onClick={() => {
        if (typeof Notification !== "undefined") void Notification.requestPermission();
      }}
    >
      {ar ? "نبّه هذا المتصفح" : "Alert this browser"}
    </button>
  );
}

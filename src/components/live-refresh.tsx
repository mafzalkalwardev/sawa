"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function LiveRefresh({ seconds = 8 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    let busy = false;
    const id = window.setInterval(() => {
      if (busy || document.hidden) return;
      busy = true;
      router.refresh();
      window.setTimeout(() => {
        busy = false;
      }, 2000);
    }, seconds * 1000);
    return () => window.clearInterval(id);
  }, [router, seconds]);
  return null;
}

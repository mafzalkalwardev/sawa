"use client";

import { useEffect } from "react";

export function LocationPublisher({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled || !navigator.geolocation) return;
    let sent = 0;
    const watch = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now();
        if (now - sent < 8000) return;
        sent = now;
        void fetch("/api/location", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ lat: position.coords.latitude, lng: position.coords.longitude, source: "gps" }),
        });
      },
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 8000 },
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [enabled]);
  return null;
}

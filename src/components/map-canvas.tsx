"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { MapPoint } from "./map";

export default function MapCanvas({ points, path }: { points: MapPoint[]; path?: [number, number][] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: import("leaflet").Map | null = null;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !ref.current) return;
      const center = points[0] ? ([points[0].lat, points[0].lng] as [number, number]) : ([25.2, 55.27] as [number, number]);
      map = L.map(ref.current, { scrollWheelZoom: false }).setView(center, 10);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);
      if (path && path.length > 1) {
        L.polyline(path, { color: "#8d6b3a", weight: 4 }).addTo(map);
      }
      const bounds: [number, number][] = [];
      for (const point of points) {
        const color = point.kind === "live" ? "#8d342c" : point.kind === "rider" ? "#1c6b45" : "#0e2a24";
        L.circleMarker([point.lat, point.lng], { radius: point.kind === "live" ? 9 : 6, color, fillColor: color, fillOpacity: 0.9 })
          .bindTooltip(point.label)
          .addTo(map);
        bounds.push([point.lat, point.lng]);
      }
      if (bounds.length > 1) map.fitBounds(bounds, { padding: [24, 24] });
    })();
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [JSON.stringify(points), JSON.stringify(path ?? [])]);

  return <div ref={ref} className="map" />;
}

"use client";

import dynamic from "next/dynamic";

const MapCanvas = dynamic(() => import("./map-canvas"), {
  ssr: false,
  loading: () => <div className="map map-loading">Map</div>,
});

export type MapPoint = { id: string; lat: number; lng: number; label: string; kind?: "stop" | "live" | "rider" };

export function MapView({ points, path }: { points: MapPoint[]; path?: [number, number][] }) {
  return <MapCanvas points={points} path={path} />;
}

"use client";

import { useEffect, useState } from "react";
import { MapView } from "./map";

type Live = {
  lat: number | null;
  lng: number | null;
  etaMin: number | null;
  nextStop: string | null;
  delayNote: string | null;
  plate: string | null;
  driver: string | null;
  path: [number, number][];
  points: { id: string; lat: number; lng: number; label: string; kind?: "stop" | "live" | "rider" }[];
};

export function LiveTrip({ runId, initial }: { runId: string; initial: Live }) {
  const [data, setData] = useState(initial);
  useEffect(() => {
    const timer = setInterval(async () => {
      const response = await fetch(`/api/runs/${runId}/live`);
      if (response.ok) setData(await response.json());
    }, 4000);
    return () => clearInterval(timer);
  }, [runId]);
  return (
    <div className="stack">
      <MapView points={data.points} path={data.path} />
      <p className="meta"><span>{data.driver}</span><span>{data.plate}</span></p>
      <p>{data.nextStop ? data.nextStop : ""}{data.etaMin != null ? ` · ${data.etaMin} min` : ""}</p>
      {data.delayNote ? <p className="alert">{data.delayNote}</p> : null}
    </div>
  );
}

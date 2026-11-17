"use client";

import { useEffect, useState } from "react";
import { MapView } from "./map";

type Live = {
  lat: number | null;
  lng: number | null;
  etaMin: number | null;
  passed?: boolean;
  awayKm: number | null;
  nextStop: string | null;
  nextStopEn?: string | null;
  nextStopAr?: string | null;
  delayNote: string | null;
  plate: string | null;
  driver: string | null;
  path: [number, number][];
  points: { id: string; lat: number; lng: number; label: string; kind?: "stop" | "live" | "rider" }[];
};

export function LiveTrip({ runId, initial, locale }: { runId: string; initial: Live; locale: string }) {
  const [data, setData] = useState(initial);
  useEffect(() => {
    const timer = setInterval(async () => {
      const response = await fetch(`/api/runs/${runId}/live?locale=${locale}`);
      if (response.ok) setData(await response.json());
    }, 4000);
    return () => clearInterval(timer);
  }, [runId]);
  return (
    <div className="stack">
      <MapView points={data.points} path={data.path} />
      <p className="muted">{locale === "ar" ? "مسار القيادة على خريطة OpenStreetMap." : "Driving route on the OpenStreetMap road network."}</p>
      {data.awayKm != null ? (
        <p className="alert">
          {locale === "ar"
            ? `الهاتف ليس على هذا الطريق، لذلك لا يُحسب وقت. تبقى المركبة على المسار.`
            : `The phone is not on this road, so there is no minute count. The van stays on the route.`}
        </p>
      ) : null}
      <p className="meta"><span>{data.driver}</span><span>{data.plate}</span></p>
      <p>
        {(locale === "ar" ? data.nextStopAr : data.nextStopEn) || data.nextStop || ""}
        {data.etaMin != null ? (locale === "ar" ? ` · حوالي ${data.etaMin} د` : ` · about ${data.etaMin} min`) : ""}
      </p>
      {data.passed ? <p className="muted">{locale === "ar" ? "تجاوزت المركبة هذا الموقف." : "The van is past this stop."}</p> : null}
      {data.delayNote ? <p className="alert">{data.delayNote}</p> : null}
    </div>
  );
}

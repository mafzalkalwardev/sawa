"use client";

import { useEffect, useMemo, useState } from "react";
import { savePlaces } from "@/server/actions/rider";

type Stop = { id: string; nameEn: string; nameAr: string };
type RouteOption = { id: string; nameEn: string; nameAr: string; stops: Stop[] };

export function PlaceForm({
  locale,
  routes,
  routeId,
  homeId,
  workId,
}: {
  locale: string;
  routes: RouteOption[];
  routeId: string;
  homeId: string;
  workId: string;
}) {
  const ar = locale === "ar";
  const [roadId, setRoadId] = useState(routeId || routes[0]?.id || "");
  const route = useMemo(() => routes.find((item) => item.id === roadId) ?? routes[0], [roadId, routes]);
  const [home, setHome] = useState(homeId || route?.stops[0]?.id || "");
  const [work, setWork] = useState(workId || route?.stops.at(-1)?.id || "");
  useEffect(() => {
    if (!route) return;
    if (!route.stops.some((stop) => stop.id === home)) setHome(route.stops[0]?.id ?? "");
    if (!route.stops.some((stop) => stop.id === work)) setWork(route.stops.at(-1)?.id ?? "");
  }, [route, home, work]);
  if (!route) return null;
  return (
    <form className="stack" action={savePlaces}>
      <input type="hidden" name="locale" value={locale} />
      <label>{ar ? "الطريق" : "Road"}
        <select name="routeId" value={route.id} onChange={(event) => setRoadId(event.target.value)}>
          {routes.map((item) => <option key={item.id} value={item.id}>{ar ? item.nameAr : item.nameEn}</option>)}
        </select>
      </label>
      <label>{ar ? "المنزل" : "Home"}
        <select name="homeStopId" value={home} onChange={(event) => setHome(event.target.value)}>
          {route.stops.map((stop) => <option key={stop.id} value={stop.id}>{ar ? stop.nameAr : stop.nameEn}</option>)}
        </select>
      </label>
      <label>{ar ? "العمل" : "Work"}
        <select name="workStopId" value={work} onChange={(event) => setWork(event.target.value)}>
          {route.stops.map((stop) => <option key={stop.id} value={stop.id}>{ar ? stop.nameAr : stop.nameEn}</option>)}
        </select>
      </label>
      <p className="muted">{ar ? "صباحاً من المنزل إلى العمل. مساءً من العمل إلى المنزل. الموقفان على نفس الطريق." : "Morning runs from home to work. Evening runs from work to home. Both stops are on the same road."}</p>
      <button className="btn" type="submit">{ar ? "احفظ المنزل والعمل" : "Save home and work"}</button>
    </form>
  );
}

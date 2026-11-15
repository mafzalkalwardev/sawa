"use client";

import { useMemo, useState } from "react";
import { windows } from "@/content/network";
import { t } from "@/i18n/copy";
import { createBooking } from "@/server/actions/rider";

type Stop = { id: string; nameEn: string; nameAr: string };
type RouteOption = {
  id: string;
  nameEn: string;
  nameAr: string;
  seatPriceAed: number;
  monthlyPriceAed: number;
  womenOnlyAvailable: boolean;
  stops: Stop[];
};

export function BookForm({ locale, routes, date }: { locale: string; routes: RouteOption[]; date: string }) {
  const m = t(locale);
  const ar = locale === "ar";
  const [routeId, setRouteId] = useState(routes[0]?.id ?? "");
  const [product, setProduct] = useState("single");
  const [shift, setShift] = useState<"morning" | "evening">("morning");
  const route = useMemo(() => routes.find((item) => item.id === routeId) ?? routes[0], [routeId, routes]);
  if (!route) return null;
  const price = product === "monthly" ? route.monthlyPriceAed : route.seatPriceAed;
  const slots = windows[shift];
  return (
    <form className="stack" action={createBooking}>
      <input type="hidden" name="locale" value={locale} />
      <label>{ar ? "الممر" : "Corridor"}
        <select name="routeId" value={routeId} onChange={(event) => setRouteId(event.target.value)}>
          {routes.map((item) => <option key={item.id} value={item.id}>{ar ? item.nameAr : item.nameEn}</option>)}
        </select>
      </label>
      <label>{m.date}<input type="date" name="serviceDate" defaultValue={date} required /></label>
      <label>{ar ? "الوردية" : "Shift"}
        <select name="shift" value={shift} onChange={(event) => setShift(event.target.value as "morning" | "evening")}>
          <option value="morning">{m.morning}</option>
          <option value="evening">{m.evening}</option>
        </select>
      </label>
      <label>{m.window}
        <select name="windowLabel" defaultValue={slots[0].en}>
          {slots.map((slot) => <option key={slot.id} value={slot.en}>{ar ? slot.ar : slot.en}</option>)}
        </select>
      </label>
      <label>{m.pickup}
        <select key={`${route.id}-pickup`} name="pickupStopId" defaultValue={route.stops[0]?.id}>
          {route.stops.map((stop) => <option key={stop.id} value={stop.id}>{ar ? stop.nameAr : stop.nameEn}</option>)}
        </select>
      </label>
      <label>{m.drop}
        <select key={`${route.id}-drop`} name="dropStopId" defaultValue={route.stops[route.stops.length - 1]?.id}>
          {route.stops.map((stop) => <option key={stop.id} value={stop.id}>{ar ? stop.nameAr : stop.nameEn}</option>)}
        </select>
      </label>
      <label>{ar ? "النوع" : "Product"}
        <select name="product" value={product} onChange={(event) => setProduct(event.target.value)}>
          <option value="single">{m.single}</option>
          <option value="monthly">{m.monthly}</option>
        </select>
      </label>
      <label className="row"><input type="checkbox" name="womenOnly" disabled={!route.womenOnlyAvailable} /> {m.womenOnly}</label>
      {!route.womenOnlyAvailable ? <p className="muted">{ar ? "لا توجد مركبة نساء فقط على هذا الممر في العرض." : "This demo corridor has no women-only vehicle."}</p> : null}
      <p className="price">{price} AED</p>
      <p className="muted">{m.vatNote}</p>
      <button className="btn" type="submit">{m.confirm}</button>
    </form>
  );
}

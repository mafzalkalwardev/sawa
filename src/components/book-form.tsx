"use client";

import { useEffect, useMemo, useState } from "react";
import { windows } from "@/content/network";
import { t } from "@/i18n/copy";
import { MONTHLY_TRIPS, quoteToll, SHARED_SEATS } from "@/lib/tolls";
import { requestRide } from "@/server/actions/requests";

type Stop = { id: string; slug: string; sequence: number; nameEn: string; nameAr: string };
type RouteOption = {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  seatPriceAed: number;
  privatePriceAed: number;
  monthlyPriceAed: number;
  monthlyPrivateAed: number;
  womenOnlyAvailable: boolean;
  stops: Stop[];
};

export function BookForm({ locale, routes, date, initialProduct = "single" }: { locale: string; routes: RouteOption[]; date: string; initialProduct?: string }) {
  const m = t(locale);
  const ar = locale === "ar";
  const [routeId, setRouteId] = useState(routes[0]?.id ?? "");
  const [product, setProduct] = useState(initialProduct === "monthly" ? "monthly" : "single");
  const [rideMode, setRideMode] = useState<"shared" | "private">("shared");
  const [shift, setShift] = useState<"morning" | "evening">("morning");
  const [serviceDate, setServiceDate] = useState(date);
  const [windowLabel, setWindowLabel] = useState<string>(windows.morning[1].en);
  const route = useMemo(() => routes.find((item) => item.id === routeId) ?? routes[0], [routeId, routes]);
  const [pickupId, setPickupId] = useState(route?.stops[0]?.id ?? "");
  const [dropId, setDropId] = useState(route?.stops[route.stops.length - 1]?.id ?? "");
  useEffect(() => {
    setPickupId(route?.stops[0]?.id ?? "");
    setDropId(route?.stops.at(-1)?.id ?? "");
  }, [route?.id]);
  if (!route) return null;
  const shared = product === "monthly" ? route.monthlyPriceAed : route.seatPriceAed;
  const alone = product === "monthly" ? route.monthlyPrivateAed : route.privatePriceAed;
  const fare = rideMode === "private" ? alone : shared;
  const slots = windows[shift];
  const pickup = route.stops.find((stop) => stop.id === pickupId) ?? route.stops[0];
  const drop = route.stops.find((stop) => stop.id === dropId) ?? route.stops.at(-1);
  const trips = product === "monthly" ? MONTHLY_TRIPS : 1;
  const tollFor = (mode: "shared" | "private") => quoteToll({
    routeSlug: route.slug,
    stops: route.stops,
    pickupSlug: pickup?.slug ?? "",
    dropSlug: drop?.slug ?? "",
    serviceDate,
    windowLabel,
    rideMode: mode,
    trips,
  });
  const sharedToll = tollFor("shared");
  const aloneToll = tollFor("private");
  const toll = rideMode === "private" ? aloneToll : sharedToll;
  const price = fare + toll.chargedAed;
  return (
    <form className="stack" action={requestRide}>
      <input type="hidden" name="locale" value={locale} />
      <label>{ar ? "أي طريق؟" : "Which road?"}
        <select name="routeId" value={routeId} onChange={(event) => setRouteId(event.target.value)}>
          {routes.map((item) => <option key={item.id} value={item.id}>{ar ? item.nameAr : item.nameEn}</option>)}
        </select>
      </label>
      <label>{m.date}<input type="date" name="serviceDate" value={serviceDate} onChange={(event) => setServiceDate(event.target.value)} required /></label>
      <label>{ar ? "صباح أم مساء؟" : "Morning or evening?"}
        <select name="shift" value={shift} onChange={(event) => {
          const next = event.target.value as "morning" | "evening";
          setShift(next);
          setWindowLabel(windows[next][1].en);
        }}>
          <option value="morning">{m.morning}</option>
          <option value="evening">{m.evening}</option>
        </select>
      </label>
      <label>{m.window}
        <select name="windowLabel" value={windowLabel} onChange={(event) => setWindowLabel(event.target.value)}>
          {slots.map((slot) => <option key={slot.id} value={slot.en}>{ar ? slot.ar : slot.en}</option>)}
        </select>
      </label>
      <label>{m.pickup}
        <select key={`${route.id}-pickup`} name="pickupStopId" value={pickup?.id} onChange={(event) => setPickupId(event.target.value)}>
          {route.stops.map((stop) => <option key={stop.id} value={stop.id}>{ar ? stop.nameAr : stop.nameEn}</option>)}
        </select>
      </label>
      <label>{m.drop}
        <select key={`${route.id}-drop`} name="dropStopId" value={drop?.id} onChange={(event) => setDropId(event.target.value)}>
          {route.stops.map((stop) => <option key={stop.id} value={stop.id}>{ar ? stop.nameAr : stop.nameEn}</option>)}
        </select>
      </label>
      <input type="hidden" name="rideMode" value={rideMode} />
      <div className="modes" role="group" aria-label={ar ? "نوع الرحلة" : "Ride type"}>
        <button type="button" className={rideMode === "shared" ? "on" : ""} onClick={() => setRideMode("shared")}>
          <strong>{ar ? "شارك المركبة" : "Share the van"}</strong>
          <span>{ar ? "مع ركاب آخرين · " : "With other passengers · "}{shared + sharedToll.chargedAed} AED</span>
        </button>
        <button type="button" className={rideMode === "private" ? "on" : ""} onClick={() => setRideMode("private")}>
          <strong>{ar ? "أنا فقط" : "Just me"}</strong>
          <span>{ar ? "المركبة لك · " : "The van is yours · "}{alone + aloneToll.chargedAed} AED</span>
        </button>
      </div>
      <label>{ar ? "كم مرة؟" : "How often?"}
        <select name="product" value={product} onChange={(event) => setProduct(event.target.value)}>
          <option value="single">{m.single}</option>
          <option value="monthly">{m.monthly}</option>
        </select>
      </label>
      {product === "monthly" ? <p className="muted">{ar ? "الأحد إلى الخميس. بعد الاتفاق تظهر في تبويب الشهر ويمكنك إيقافها." : "Sunday to Thursday. After you agree, it shows under Month and you can pause it."}</p> : null}
      {rideMode === "shared" ? <p className="muted">{ar ? "مشاركة المركبة تنضم إلى فان مفتوح على هذا الطريق. حتى 4 ركاب. السعر ينقص كلما امتلأت المقاعد، ويمكن تقسيم الأجرة بعد التأكيد." : "Sharing joins an open van on this road, up to 4 people. The price falls as seats fill, and you can split the fare after it is confirmed."}</p> : null}
      <label className="row"><input type="checkbox" name="womenOnly" disabled={!route.womenOnlyAvailable} /> {m.womenOnly}</label>
      {!route.womenOnlyAvailable ? <p className="muted">{ar ? "لا توجد مركبة نساء فقط على هذا الممر." : "No women-only vehicle is on this corridor."}</p> : null}
      <p className="price">{price} AED</p>
      <p className="muted">{ar ? `الأجرة ${fare} درهم` : `Fare AED ${fare}`}</p>
      {toll.lines.length ? (
        <ul>
          {toll.lines.map((line) => (
            <li key={line.nameEn}>{ar ? line.nameAr : line.nameEn}: {line.aed.toFixed(2)} AED{rideMode === "shared" ? (ar ? ` ÷ ${SHARED_SEATS}` : ` ÷ ${SHARED_SEATS} seats`) : ""}{product === "monthly" ? (ar ? ` × ${MONTHLY_TRIPS}` : ` × ${MONTHLY_TRIPS} trips`) : ""}</li>
          ))}
        </ul>
      ) : <p className="muted">{ar ? "لا بوابة سالك أو درب بين هذين الموقفين." : "No Salik or Darb gate between these stops."}</p>}
      <label>{ar ? "ملاحظة للسائق" : "Note for the driver"}<input name="note" placeholder={ar ? "وقت الوصول، البوابة، عدد الحقائب" : "Arrival time, gate, bags"} /></label>
      <button className="btn" type="submit">{ar ? "أرسل هذه الرحلة" : "Send this ride"}</button>
    </form>
  );
}

import { weekdaySun0 } from "@/lib/time";

/** Published Salik tariff from 1 June 2026: base AED 6 / 4 plus 5% VAT. */
export const SALIK_PEAK_AED = 6.3;
export const SALIK_OFFPEAK_AED = 4.2;
/** Darb fee published by Abu Dhabi Mobility. No VAT on this toll. */
export const DARB_AED = 4;
/** A shared van on these corridors is quoted as four paying seats. */
export const SHARED_SEATS = 4;
export const MONTHLY_TRIPS = 22;

type System = "salik" | "darb-always" | "darb-peak";

type Span = {
  route: string;
  from: string;
  to: string;
  nameEn: string;
  nameAr: string;
  system: System;
};

/** A gate is crossed only when the booked stops pass the stretch it sits on. */
const spans: Span[] = [
  { route: "sharjah-dubai", from: "nahda-dxb", to: "qusais", nameEn: "Salik · Al Mamzar pair, charged once", nameAr: "سالك · زوج الممزر، يُحسب مرة", system: "salik" },
  { route: "sharjah-dubai", from: "union", to: "fahidi", nameEn: "Salik · Al Maktoum Bridge", nameAr: "سالك · جسر المكتوم", system: "salik" },
  { route: "ajman-dubai", from: "rashidiya", to: "dxt3", nameEn: "Salik · Airport Tunnel", nameAr: "سالك · نفق المطار", system: "salik" },
  { route: "ajman-dubai", from: "difc", to: "business-bay", nameEn: "Salik · Business Bay Crossing", nameAr: "سالك · معبر الخليج التجاري", system: "salik" },
  { route: "dubai-abu-dhabi", from: "ibn-battuta", to: "jebel-ali", nameEn: "Salik · Jebel Ali", nameAr: "سالك · جبل علي", system: "salik" },
  { route: "dubai-abu-dhabi", from: "jebel-ali", to: "ghantoot", nameEn: "Darb · Ghantoot, all day", nameAr: "درب · غنتوت، طوال اليوم", system: "darb-always" },
  { route: "dubai-abu-dhabi", from: "yas", to: "al-wahda", nameEn: "Darb · Sas Al Nakhl bridge", nameAr: "درب · جسر ساس النخل", system: "darb-peak" },
];

export type TollStop = { slug: string; sequence: number };

export type TollLine = { nameEn: string; nameAr: string; aed: number };

export type TollQuote = {
  lines: TollLine[];
  vehicleAed: number;
  riderAed: number;
  chargedAed: number;
  trips: number;
};

function windowHour(label: string) {
  const match = label.match(/(\d{1,2}):(\d{2})/);
  if (!match) return 7;
  return Number(match[1]) + Number(match[2]) / 60;
}

export function salikAed(serviceDate: string, windowLabel: string) {
  const hour = windowHour(windowLabel);
  if (hour >= 1 && hour < 6) return 0;
  const sunday = weekdaySun0(serviceDate) === 0;
  if (sunday) return SALIK_OFFPEAK_AED;
  const peak = (hour >= 6 && hour < 10) || (hour >= 16 && hour < 20);
  return peak ? SALIK_PEAK_AED : SALIK_OFFPEAK_AED;
}

export function darbPeakAed(serviceDate: string, windowLabel: string) {
  const hour = windowHour(windowLabel);
  if (weekdaySun0(serviceDate) === 0) return 0;
  const peak = (hour >= 7 && hour < 9) || (hour >= 15 && hour < 19);
  return peak ? DARB_AED : 0;
}

function gateAed(system: System, serviceDate: string, windowLabel: string) {
  if (system === "darb-always") return DARB_AED;
  if (system === "darb-peak") return darbPeakAed(serviceDate, windowLabel);
  return salikAed(serviceDate, windowLabel);
}

export function quoteToll(input: {
  routeSlug: string;
  stops: TollStop[];
  pickupSlug: string;
  dropSlug: string;
  serviceDate: string;
  windowLabel: string;
  rideMode: "shared" | "private";
  trips?: number;
}): TollQuote {
  const trips = input.trips ?? 1;
  const bySlug = new Map(input.stops.map((stop) => [stop.slug, stop.sequence]));
  const pickup = bySlug.get(input.pickupSlug);
  const drop = bySlug.get(input.dropSlug);
  if (pickup == null || drop == null || pickup === drop) {
    return { lines: [], vehicleAed: 0, riderAed: 0, chargedAed: 0, trips };
  }
  const start = Math.min(pickup, drop);
  const end = Math.max(pickup, drop);
  const lines = spans
    .filter((span) => span.route === input.routeSlug)
    .filter((span) => {
      const from = bySlug.get(span.from);
      const to = bySlug.get(span.to);
      return from != null && to != null && from >= start && to <= end;
    })
    .map((span) => ({
      nameEn: span.nameEn,
      nameAr: span.nameAr,
      aed: gateAed(span.system, input.serviceDate, input.windowLabel),
    }));
  const vehicleAed = lines.reduce((sum, line) => sum + line.aed, 0);
  const perTrip = input.rideMode === "private" ? vehicleAed : vehicleAed / SHARED_SEATS;
  const riderAed = perTrip * trips;
  return {
    lines,
    vehicleAed,
    riderAed,
    chargedAed: Math.round(riderAed),
    trips,
  };
}

export function dubaiStamp(when: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dubai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(when);
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${pick("year")}-${pick("month")}-${pick("day")} ${pick("hour")}:${pick("minute")}`;
}

export function dubaiToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dubai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00+04:00`);
  d.setUTCDate(d.getUTCDate() + days);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dubai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function weekdaySun0(iso: string) {
  return new Date(`${iso}T12:00:00+04:00`).getUTCDay();
}

export function weekdayName(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-AE" : "en-AE", {
    timeZone: "Asia/Dubai",
    weekday: "long",
    day: "numeric",
    month: "short",
  }).format(new Date(`${iso}T12:00:00+04:00`));
}

export function shiftStart(date: string, shift: string) {
  const hm = shift === "morning" ? "05:40" : "16:20";
  return new Date(`${date}T${hm}:00+04:00`);
}

export function hoursUntilShift(date: string, shift: string, now = new Date()) {
  return (shiftStart(date, shift).getTime() - now.getTime()) / 36e5;
}

export function aed(amount: number, locale: string) {
  return new Intl.NumberFormat(locale === "ar" ? "ar-AE" : "en-AE", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function aedExact(amount: number, locale: string) {
  return new Intl.NumberFormat(locale === "ar" ? "ar-AE" : "en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export const DEMO_OTP = process.env.DEMO_OTP || "123456";

import { Notice } from "@/components/notice";
import { t } from "@/i18n/copy";
import { windows } from "@/content/network";
import { requireRider } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dubaiToday } from "@/lib/time";
import { saveCommute } from "@/server/actions/rider";

export default async function CommutePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  await requireRider(locale);
  const routes = await prisma.route.findMany({ include: { stops: { orderBy: { sequence: "asc" } } } });
  const m = t(locale);
  const ar = locale === "ar";
  return (
    <>
      <h1>{ar ? "تنقلك الثابت" : "Your commute"}</h1>
      <p className="muted">{ar ? "الأحد إلى الخميس. الدفع من صفحة الباقة يفعّل المقعد في التخطيط." : "Sunday to Thursday. Paying on the pass page puts the seat into planning."}</p>
      <Notice locale={locale} code={query.error} />
      <form className="stack" action={saveCommute}>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="startDate" value={dubaiToday()} />
        <label>{ar ? "الممر" : "Corridor"}
          <select name="routeId" defaultValue={routes[0]?.id}>
            {routes.map((route) => <option key={route.id} value={route.id}>{ar ? route.nameAr : route.nameEn}</option>)}
          </select>
        </label>
        <label>{m.pickup}
          <select name="pickupStopId">
            {routes.flatMap((route) => route.stops.map((stop) => <option key={stop.id} value={stop.id}>{ar ? `${route.nameAr} · ${stop.nameAr}` : `${route.nameEn} · ${stop.nameEn}`}</option>))}
          </select>
        </label>
        <label>{m.drop}
          <select name="dropStopId">
            {routes.flatMap((route) => route.stops.map((stop) => <option key={`d-${stop.id}`} value={stop.id}>{ar ? `${route.nameAr} · ${stop.nameAr}` : `${route.nameEn} · ${stop.nameEn}`}</option>))}
          </select>
        </label>
        <label>{m.morning}
          <select name="morningWindow">{windows.morning.map((slot) => <option key={slot.id} value={slot.en}>{slot.en}</option>)}</select>
        </label>
        <label>{m.evening}
          <select name="eveningWindow">{windows.evening.map((slot) => <option key={slot.id} value={slot.en}>{slot.en}</option>)}</select>
        </label>
        <label className="row"><input type="checkbox" name="womenOnly" /> {m.womenOnly}</label>
        <button className="btn" type="submit">{m.save}</button>
      </form>
    </>
  );
}

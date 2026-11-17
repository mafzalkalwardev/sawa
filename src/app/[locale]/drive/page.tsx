import Link from "next/link";
import { Notice } from "@/components/notice";
import { t } from "@/i18n/copy";
import { requireDriver } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dubaiToday } from "@/lib/time";
import { driverDocsValid } from "@/server/records";
import { ensureServiceDay } from "@/server/service-day";
import { startShift } from "@/server/actions/driver";
import { acceptRequest } from "@/server/actions/requests";
import { LiveRefresh } from "@/components/live-refresh";
import { Steps, driverSteps } from "@/components/steps";

export default async function DriveHome({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const driver = await requireDriver(locale);
  await ensureServiceDay();
  const valid = await driverDocsValid(driver.id, driver.defaultVehicleId);
  const requests = await prisma.rideRequest.findMany({
    where: { status: { in: ["queued", "accepted", "agreed"] } },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  const routes = await prisma.route.findMany();
  const people = await prisma.customer.findMany({ where: { id: { in: requests.map((item) => item.customerId) } } });
  const pools = await prisma.pool.findMany({
    where: { id: { in: requests.map((item) => item.poolId).filter((id): id is string => Boolean(id)) } },
    include: { requests: true },
  });
  const mine = driver.preferredRouteIds.split(",").map((item) => item.trim());
  const visible = requests.filter((item) => {
    const route = routes.find((entry) => entry.id === item.routeId);
    if (!route || !mine.includes(route.slug)) return false;
    return item.status === "queued" || item.driverId === driver.id;
  });
  const run = await prisma.run.findFirst({
    where: { driverId: driver.id, serviceDate: dubaiToday(), status: { not: "cancelled" } },
    include: { route: true, bookings: true },
  });
  const m = t(locale);
  const ar = locale === "ar";
  return (
    <>
      <LiveRefresh />
      {driver.status === "approved" ? <Steps labels={driverSteps(ar)} current={3} /> : <Steps labels={driverSteps(ar)} current={2} />}
      <h1>{driver.displayName}</h1>
      <p><span className={`tag ${driver.status === "approved" ? "good" : "warn"}`}>{driver.status === "approved" ? (ar ? "مقبول" : "Approved") : driver.status === "submitted" ? (ar ? "بانتظار المراجعة" : "Waiting for review") : driver.status === "suspended" ? (ar ? "موقوف" : "Suspended") : driver.status}</span> {driver.onShift ? (ar ? "على الوردية" : "On shift") : (ar ? "خارج الوردية" : "Off shift")}</p>
      <Notice locale={locale} code={query.error} ok={query.ok} />
      {run ? (
        <Link className="choice" href={`/${locale}/drive/shift`}>
          <span><strong>{ar ? "مركبة اليوم" : "Today's van"}</strong><span>{ar ? run.route.nameAr : run.route.nameEn} · {run.bookings.filter((item) => item.status !== "cancelled").length} {ar ? "ركاب" : "passengers"}</span></span>
          <strong>→</strong>
        </Link>
      ) : null}
      <h2>{ar ? "رحلات بانتظارك" : "Rides waiting for you"}</h2>
      {visible.length === 0 ? <p className="card">{ar ? "لا توجد رحلة على طريقك الآن." : "No ride is waiting on your road right now."}</p> : null}
      {visible.map((item) => {
        const route = routes.find((entry) => entry.id === item.routeId);
        const person = people.find((entry) => entry.id === item.customerId);
        const pool = pools.find((entry) => entry.id === item.poolId);
        const mates = item.poolId ? visible.filter((entry) => entry.poolId === item.poolId && entry.status === "queued") : [item];
        if (item.status === "queued" && item.poolId && mates[0]?.id !== item.id) return null;
        const shown = item.status === "queued" ? mates : [item];
        const names = shown.map((entry) => people.find((personItem) => personItem.id === entry.customerId)?.fullName).filter(Boolean);
        const filled = pool ? pool.requests.filter((entry) => entry.status !== "cancelled").length : 1;
        const fare = shown.reduce((sum, entry) => sum + (entry.offerAed || 0), 0);
        return (
          <article key={item.id} className="card">
            <p className="pill">{item.product === "monthly" ? (ar ? "شهري" : "Monthly") : (ar ? "يوم واحد" : "One day")} · {item.rideMode === "shared" ? (ar ? "فان مشترك" : "Shared van") : (ar ? "أنا فقط" : "Just me")} · {item.status === "queued" ? (ar ? "بانتظارك" : "Waiting") : item.status === "agreed" ? (ar ? "متفق" : "Agreed") : (ar ? "مقبول" : "Accepted")}</p>
            {person?.photoUrl && shown.length === 1 ? <img className="avatar" src={`/api/files/riders/${person.id}/${person.photoUrl}`} alt="" /> : null}
            <h2>{names.length > 1 ? names.join(" · ") : (person?.fullName || (ar ? "راكب" : "Rider"))}</h2>
            <p>{route ? (ar ? route.nameAr : route.nameEn) : ""} · {item.windowLabel}</p>
            {pool && item.rideMode === "shared" ? <p>{ar ? `${filled} من ${pool.seats} مقاعد` : `${filled} of ${pool.seats} seats`}</p> : null}
            <p>{fare ? `${fare} AED` : ""}</p>
            {item.status === "queued" ? (
              <form action={acceptRequest}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="requestId" value={item.id} />
                <button className="btn" type="submit">{shown.length > 1 ? (ar ? "أقبل هذه المركبة" : "I'll take this van") : (ar ? "أقبل هذه الرحلة" : "I'll take this ride")}</button>
              </form>
            ) : (
              <Link className="btn" href={`/${locale}/drive/requests/${item.id}`}>{ar ? "افتح الرحلة" : "Open this ride"}</Link>
            )}
          </article>
        );
      })}
      <p className="muted">{m.locationDisclosure}</p>
      {driver.status !== "approved" || !valid ? (
        <p className="alert">{m.errors.shift} <Link href={`/${locale}/drive/documents`}>{m.papers}</Link></p>
      ) : driver.onShift ? null : (
        <form action={startShift}>
          <input type="hidden" name="locale" value={locale} />
          <button className="btn" type="submit">{m.goOnline}</button>
        </form>
      )}
      {run ? (
        <section className="card">
          <h2>{ar ? run.route.nameAr : run.route.nameEn}</h2>
          <p>{run.shift} · {run.status} · {run.bookings.length} {m.seats}</p>
          <p className="muted">{driver.baseAddress}</p>
          <Link className="btn" href={`/${locale}/drive/shift`}>{m.today}</Link>
          <Link className="btn ghost" href={`/${locale}/drive/chat`}>{ar ? "المحادثات" : "Chats"}</Link>
        </section>
      ) : (
        <p className="card">{ar ? "لا توجد رحلة اليوم." : "No run today."}</p>
      )}
    </>
  );
}

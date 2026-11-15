import Link from "next/link";
import { Notice } from "@/components/notice";
import { t } from "@/i18n/copy";
import { requireDriver } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dubaiToday } from "@/lib/time";
import { driverDocsValid } from "@/server/records";
import { ensureServiceDay } from "@/server/service-day";
import { startShift } from "@/server/actions/driver";

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
  const run = await prisma.run.findFirst({
    where: { driverId: driver.id, serviceDate: dubaiToday(), status: { not: "cancelled" } },
    include: { route: true, bookings: true },
  });
  const m = t(locale);
  const ar = locale === "ar";
  return (
    <>
      <h1>{driver.displayName}</h1>
      <p><span className={`tag ${driver.status === "approved" ? "good" : "warn"}`}>{driver.status}</span> {driver.onShift ? (ar ? "على الوردية" : "On shift") : (ar ? "خارج الوردية" : "Off shift")}</p>
      <Notice locale={locale} code={query.error} ok={query.ok} />
      <p className="muted">{m.locationDisclosure}</p>
      {driver.status !== "approved" || !valid ? (
        <p className="alert">{m.errors.shift} <Link href={`/${locale}/drive/documents`}>{m.papers}</Link></p>
      ) : (
        <form action={startShift}>
          <input type="hidden" name="locale" value={locale} />
          <button className="btn" type="submit">{m.goOnline}</button>
        </form>
      )}
      {run ? (
        <section className="card">
          <h2>{ar ? run.route.nameAr : run.route.nameEn}</h2>
          <p>{run.shift} · {run.status} · {run.bookings.length} {m.seats}</p>
          <Link className="btn" href={`/${locale}/drive/shift`}>{m.today}</Link>
        </section>
      ) : (
        <p className="card">{ar ? "لا توجد رحلة اليوم." : "No run today."}</p>
      )}
    </>
  );
}

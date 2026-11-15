import { notFound } from "next/navigation";
import { Notice } from "@/components/notice";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { substituteDriver } from "@/server/actions/ops";

export default async function TripDetail({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { locale, id } = await params;
  const query = await searchParams;
  await requireStaff(locale);
  const run = await prisma.run.findUnique({
    where: { id },
    include: { route: true, driver: true, vehicle: true, bookings: { include: { customer: true } }, stopEvents: { orderBy: { sequence: "asc" } }, boardings: true },
  });
  if (!run) notFound();
  const stops = await prisma.stop.findMany({ where: { routeId: run.routeId } });
  const stopName = new Map(stops.map((stop) => [stop.id, stop]));
  const drivers = await prisma.driver.findMany({ where: { status: "approved" } });
  const ar = locale === "ar";
  return (
    <>
      <h1>{ar ? run.route.nameAr : run.route.nameEn}</h1>
      <Notice locale={locale} ok={query.ok} code={query.error} />
      <p>{run.driver.displayName} · {run.vehicle.plate} · {run.status}{run.delayNote ? ` · ${run.delayNote}` : ""}</p>
      <table>
        <tbody>
          {run.bookings.map((booking) => (
            <tr key={booking.id}>
              <td>{booking.customer.fullName}</td>
              <td>{ar ? stopName.get(booking.pickupStopId)?.nameAr : stopName.get(booking.pickupStopId)?.nameEn}</td>
              <td>{booking.status}</td>
              <td>{booking.pin}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>{ar ? "المواقف" : "Stops"}</h2>
      <ul>
        {run.stopEvents.map((event) => (
          <li key={event.id}>{ar ? stopName.get(event.stopId)?.nameAr : stopName.get(event.stopId)?.nameEn} · {event.status}</li>
        ))}
      </ul>
      <form className="card stack" action={substituteDriver}>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="runId" value={run.id} />
        <h2>{ar ? "استبدال" : "Substitute"}</h2>
        <select name="driverId">{drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.displayName}</option>)}</select>
        <input name="reason" placeholder={ar ? "السبب" : "Reason"} required />
        <button className="btn" type="submit">{ar ? "استبدال" : "Substitute"}</button>
      </form>
    </>
  );
}

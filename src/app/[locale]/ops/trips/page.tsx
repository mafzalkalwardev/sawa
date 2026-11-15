import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dubaiToday } from "@/lib/time";

export default async function TripsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  await requireStaff(locale);
  const date = query.date || dubaiToday();
  const runs = await prisma.run.findMany({
    where: { serviceDate: date },
    include: { route: true, driver: true, vehicle: true, bookings: true },
    orderBy: { shift: "asc" },
  });
  const ar = locale === "ar";
  return (
    <>
      <h1>{ar ? "رحلات اليوم" : "Runs"}</h1>
      <form>
        <label>{ar ? "التاريخ" : "Date"}<input type="date" name="date" defaultValue={date} /></label>
        <button className="btn small" type="submit">{ar ? "عرض" : "Show"}</button>
      </form>
      <table>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id}>
              <td><Link href={`/${locale}/ops/trips/${run.id}`}>{ar ? run.route.nameAr : run.route.nameEn}</Link></td>
              <td>{run.shift}</td>
              <td>{run.driver.displayName}</td>
              <td>{run.vehicle.plate}</td>
              <td>{run.bookings.filter((booking) => booking.status === "boarded").length}/{run.bookings.length}</td>
              <td>{run.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

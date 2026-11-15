import Link from "next/link";
import { Notice } from "@/components/notice";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { addDays, dubaiToday } from "@/lib/time";
import { enforceDocumentExpiry } from "@/server/records";
import { ensureServiceDay } from "@/server/service-day";

export default async function Dashboard({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  await requireStaff(locale);
  await ensureServiceDay();
  await enforceDocumentExpiry();
  const today = dubaiToday();
  const soon = addDays(today, 30);
  const [runs, sos, expiring, openTickets] = await Promise.all([
    prisma.run.findMany({ where: { serviceDate: today }, include: { bookings: true, vehicle: true, driver: true, route: true } }),
    prisma.ticket.findMany({ where: { kind: "sos", status: { not: "resolved" } }, orderBy: { createdAt: "desc" } }),
    prisma.document.findMany({ where: { expiryDate: { lte: soon, gte: today }, status: "approved" } }),
    prisma.ticket.count({ where: { status: { in: ["open", "pending"] } } }),
  ]);
  const subs = await prisma.commuteSubscription.count({ where: { status: "active" } });
  const placed = await prisma.booking.count({ where: { serviceDate: today, status: { in: ["confirmed", "boarded", "completed"] } } });
  const ar = locale === "ar";
  return (
    <>
      <h1>{ar ? "اليوم" : "Today"}</h1>
      <Notice locale={locale} code={query.error} ok={query.ok} />
      <div className="grid">
        <article className="card"><h2>{runs.length}</h2><p>{ar ? "رحلات" : "Runs"}</p></article>
        <article className="card"><h2>{placed}</h2><p>{ar ? "مقاعد موضوعة" : "Seats placed"}</p></article>
        <article className="card"><h2>{subs}</h2><p>{ar ? "اشتراكات نشطة" : "Active passes"}</p></article>
        <article className="card"><h2>{openTickets}</h2><p>{ar ? "تذاكر مفتوحة" : "Open tickets"}</p></article>
      </div>
      <h2>{ar ? "تنبيهات" : "Alerts"}</h2>
      {sos.length === 0 ? <p>{ar ? "لا يوجد نداء عاجل." : "No SOS."}</p> : sos.map((ticket) => <p key={ticket.id} className="alert"><Link href={`/${locale}/ops/tickets/${ticket.id}`}>{ticket.subject}</Link></p>)}
      <h2>{ar ? "أوراق تقترب من الانتهاء" : "Documents expiring"}</h2>
      <ul>{expiring.map((doc) => <li key={doc.id}>{doc.type} · {doc.expiryDate}</li>)}</ul>
      <h2>{ar ? "الرحلات" : "Runs"}</h2>
      <table>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id}>
              <td><Link href={`/${locale}/ops/trips/${run.id}`}>{ar ? run.route.nameAr : run.route.nameEn}</Link></td>
              <td>{run.driver.displayName}</td>
              <td>{run.bookings.length}/{run.vehicle.seatCapacity}</td>
              <td>{run.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p><Link className="btn" href={`/${locale}/ops/plan`}>{ar ? "لوحة التخطيط" : "Planning board"}</Link></p>
    </>
  );
}

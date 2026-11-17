import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRider } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const customer = await requireRider(locale);
  const booking = await prisma.booking.findFirst({
    where: { id, customerId: customer.id },
    include: { run: { include: { driver: true, vehicle: true, route: true } } },
  });
  if (!booking) notFound();
  if (booking.status !== "completed") redirect(`/${locale}/ride/trip/${booking.id}`);
  const ar = locale === "ar";
  const pickup = await prisma.stop.findUnique({ where: { id: booking.pickupStopId } });
  const drop = await prisma.stop.findUnique({ where: { id: booking.dropStopId } });
  const route = booking.run?.route ?? await prisma.route.findUnique({ where: { id: booking.routeId } });
  const entries = await prisma.walletEntry.findMany({ where: { bookingId: booking.id }, orderBy: { createdAt: "asc" } });
  const invoice = booking.invoiceId ? await prisma.invoice.findUnique({ where: { id: booking.invoiceId } }) : null;
  const owed = Math.max(0, booking.priceAed - booking.walletPaidAed);
  const reason = (value: string) => {
    if (value === "fare") return ar ? "من المحفظة" : "From the wallet";
    if (value === "cancel") return ar ? "إلغاء" : "Cancelled seat";
    if (value === "stops") return ar ? "تغيير الموقف" : "Changed stops";
    return value;
  };
  return (
    <>
      <section className="ticket">
        <p className="eyebrow">{ar ? "إيصال" : "Receipt"}</p>
        <h2>{route ? (ar ? route.nameAr : route.nameEn) : (ar ? "رحلة" : "Ride")}</h2>
        <p>{booking.serviceDate} · {booking.shift === "evening" ? (ar ? "مساء" : "Evening") : (ar ? "صباح" : "Morning")} · {booking.windowLabel}</p>
        <p>{pickup ? (ar ? pickup.nameAr : pickup.nameEn) : ""} → {drop ? (ar ? drop.nameAr : drop.nameEn) : ""}</p>
        {booking.run?.driver ? <p>{booking.run.driver.displayName}{booking.run.vehicle ? ` · ${booking.run.vehicle.plate}` : ""}</p> : null}
        <p className="price">{booking.priceAed} AED</p>
        <p>{ar ? `من المحفظة ${booking.walletPaidAed} درهم` : `AED ${booking.walletPaidAed} from the wallet`}</p>
        <p>{owed > 0 ? (ar ? `${owed} درهم لم تُؤخذ من المحفظة` : `AED ${owed} was not taken from the wallet`) : (ar ? "الأجرة مغطاة من المحفظة." : "The fare is covered from the wallet.")}</p>
      </section>
      <p className="muted">{ar ? "هذا سجل للأجرة المتفق عليها في هذا العرض. ليس إيصالاً من شركة بطاقات، وليس فاتورة ضريبية." : "This is a record of the fare agreed in this demo. It is not a receipt from a card company, and it is not a tax invoice."}</p>
      {invoice?.status === "refunded" ? <p className="muted">{ar ? "سُجّل إشعار دائن تجريبي. لم يُعاد المبلغ إلى بنك." : "A demo credit note was recorded. The amount was not sent back to a bank."}</p> : null}
      {entries.length ? (
        <div className="stack">
          {entries.map((entry) => <p key={entry.id}>{reason(entry.reason)} · {entry.amountAed > 0 ? "+" : ""}{entry.amountAed} AED</p>)}
        </div>
      ) : null}
      <p><Link href={`/${locale}/ride/history`}>{ar ? "رحلاتك" : "Your rides"}</Link> · <Link href={`/${locale}/ride/trip/${booking.id}`}>{ar ? "الرحلة" : "The ride"}</Link></p>
    </>
  );
}

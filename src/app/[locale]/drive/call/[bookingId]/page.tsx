import Link from "next/link";
import { notFound } from "next/navigation";
import { CallBox } from "@/components/call-box";
import { requireDriver } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dubaiToday, vanTitle } from "@/lib/time";

export default async function DriverCallPage({
  params,
}: {
  params: Promise<{ locale: string; bookingId: string }>;
}) {
  const { locale, bookingId } = await params;
  const driver = await requireDriver(locale);
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, run: { driverId: driver.id } },
    include: { customer: true },
  });
  if (!booking) notFound();
  const ar = locale === "ar";
  return (
    <>
      <h1>{booking.customer.fullName.split(" ")[0] || (ar ? "راكب" : "Passenger")}</h1>
      <CallBox bookingId={booking.id} locale={locale} />
      <p><Link href={booking.runId ? `/${locale}/drive/shift?run=${booking.runId}` : `/${locale}/drive`}>{vanTitle(booking.serviceDate, booking.shift, dubaiToday(), ar)}</Link></p>
    </>
  );
}

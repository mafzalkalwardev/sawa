import Link from "next/link";
import { notFound } from "next/navigation";
import { CallBox } from "@/components/call-box";
import { requireDriver } from "@/lib/auth";
import { prisma } from "@/lib/db";

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
      <p><Link href={`/${locale}/drive/shift`}>{ar ? "مركبة اليوم" : "Today's van"}</Link></p>
    </>
  );
}

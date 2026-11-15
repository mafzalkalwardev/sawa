import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { addStaffNote } from "@/server/actions/ops";

export default async function CustomerDetail({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const { locale, id } = await params;
  const query = await searchParams;
  await requireStaff(locale);
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: { corporate: true, preference: true, places: true, subscriptions: { include: { route: true } }, bookings: { take: 10, orderBy: { serviceDate: "desc" } }, invoices: true },
  });
  if (!customer) notFound();
  const notes = await prisma.note.findMany({ where: { entityType: "customer", entityId: id }, orderBy: { createdAt: "desc" } });
  const ar = locale === "ar";
  return (
    <>
      <h1>{customer.fullName}</h1>
      {query.ok ? <p className="alert good">Saved.</p> : null}
      <p>{customer.phone} · {customer.status} · {customer.payerType} · {customer.corporate?.name || "—"}</p>
      <p>{customer.preference?.womenOnly ? (ar ? "نساء فقط" : "Women only") : ""} {customer.preference?.accessibility || ""}</p>
      <h2>{ar ? "الأماكن" : "Places"}</h2>
      <ul>{customer.places.map((place) => <li key={place.id}>{place.kind}: {place.address}</li>)}</ul>
      <h2>{ar ? "الاشتراك" : "Pass"}</h2>
      <ul>{customer.subscriptions.map((sub) => <li key={sub.id}>{ar ? sub.route.nameAr : sub.route.nameEn} · {sub.status} · {sub.priceAed}</li>)}</ul>
      <h2>{ar ? "الفواتير" : "Invoices"}</h2>
      <ul>{customer.invoices.map((invoice) => <li key={invoice.id}>{invoice.description} · {invoice.amountAed} · {invoice.status}</li>)}</ul>
      <h2>{ar ? "الرحلات" : "Trips"}</h2>
      <ul>{customer.bookings.map((booking) => <li key={booking.id}>{booking.serviceDate} · {booking.status}</li>)}</ul>
      <ul>{notes.map((note) => <li key={note.id}>{note.authorName}: {note.text}</li>)}</ul>
      <form action={addStaffNote} className="stack">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="entityType" value="customer" />
        <input type="hidden" name="entityId" value={customer.id} />
        <textarea name="text" required />
        <button className="btn ghost" type="submit">{ar ? "ملاحظة" : "Add note"}</button>
      </form>
    </>
  );
}

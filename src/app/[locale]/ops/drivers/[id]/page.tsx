import { notFound } from "next/navigation";
import { MapView } from "@/components/map";
import { Notice } from "@/components/notice";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { addStaffNote, reviewDriver } from "@/server/actions/ops";

export default async function DriverDetail({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { locale, id } = await params;
  const query = await searchParams;
  await requireStaff(locale);
  const driver = await prisma.driver.findUnique({
    where: { id },
    include: { operator: true, vehicles: true, shifts: true },
  });
  if (!driver) notFound();
  const docs = await prisma.document.findMany({ where: { OR: [{ ownerType: "driver", ownerId: driver.id }, ...driver.vehicles.map((vehicle) => ({ ownerType: "vehicle", ownerId: vehicle.id }))] } });
  const notes = await prisma.note.findMany({ where: { entityType: "driver", entityId: driver.id }, orderBy: { createdAt: "desc" } });
  const ar = locale === "ar";
  const points = [];
  if (driver.baseLat != null && driver.baseLng != null) points.push({ id: "base", lat: driver.baseLat, lng: driver.baseLng, label: ar ? "القاعدة" : "Base", kind: "stop" as const });
  if (driver.liveLat != null && driver.liveLng != null) points.push({ id: "live", lat: driver.liveLat, lng: driver.liveLng, label: driver.displayName, kind: "live" as const });
  return (
    <>
      <h1>{driver.fullName}</h1>
      <Notice locale={locale} ok={query.ok} code={query.error} />
      <p>{driver.phone} · {driver.operator.name} · {driver.operator.licenceRef}</p>
      <p><span className="tag">{driver.status}</span> {driver.onShift ? (ar ? "على الوردية" : "On shift") : ""}</p>
      <p>{ar ? "دعوة التطبيق" : "App invite"}: {driver.phone} · OTP 123456 · /{locale}/drive/login</p>
      {points.length ? <MapView points={points} /> : null}
      <h2>{ar ? "المركبات" : "Vehicles"}</h2>
      <ul>{driver.vehicles.map((vehicle) => <li key={vehicle.id}>{vehicle.plate} · {vehicle.type} · {vehicle.seatCapacity} · {vehicle.ladiesLicensed ? "ladies" : "mixed"} · {vehicle.wheelchair ? "wheelchair" : ""}</li>)}</ul>
      <h2>{ar ? "الوردية" : "Shifts"}</h2>
      <ul>{driver.shifts.map((shift) => <li key={shift.id}>{shift.label} {shift.startTime}-{shift.endTime} · {shift.days}</li>)}</ul>
      <h2>{ar ? "المستندات" : "Documents"}</h2>
      <ul>{docs.map((doc) => <li key={doc.id}>{doc.type} · {doc.status} · {doc.expiryDate || "—"} · {doc.identifier}</li>)}</ul>
      <form className="row" action={reviewDriver}>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="driverId" value={driver.id} />
        <select name="status">
          {["in_review", "approved", "needs_resubmission", "suspended", "rejected"].map((status) => <option key={status}>{status}</option>)}
        </select>
        <button className="btn" type="submit">{ar ? "تحديث الحالة" : "Update status"}</button>
      </form>
      <h2>{ar ? "ملاحظات" : "Notes"}</h2>
      <ul>{notes.map((note) => <li key={note.id}>{note.authorName}: {note.text}</li>)}</ul>
      <form action={addStaffNote} className="stack">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="entityType" value="driver" />
        <input type="hidden" name="entityId" value={driver.id} />
        <textarea name="text" required />
        <button className="btn ghost" type="submit">{ar ? "أضف ملاحظة" : "Add note"}</button>
      </form>
    </>
  );
}

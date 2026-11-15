import { Notice } from "@/components/notice";
import { t } from "@/i18n/copy";
import { requireDriver } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadDocument } from "@/server/actions/driver";

const types = ["emirates_id", "licence", "permit", "insurance", "photo_front", "photo_back", "photo_left", "photo_right", "photo_interior", "photo_plate", "photo_selfie"];

export default async function DocumentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const driver = await requireDriver(locale);
  const docs = await prisma.document.findMany({
    where: { OR: [{ ownerType: "driver", ownerId: driver.id }, ...(driver.defaultVehicleId ? [{ ownerType: "vehicle", ownerId: driver.defaultVehicleId }] : [])] },
    orderBy: { createdAt: "desc" },
  });
  const m = t(locale);
  const ar = locale === "ar";
  return (
    <>
      <h1>{m.papers}</h1>
      <p><span className="tag">{driver.status}</span></p>
      <Notice locale={locale} ok={query.ok} code={query.error} />
      <form className="stack card" action={uploadDocument}>
        <input type="hidden" name="locale" value={locale} />
        <label>{ar ? "النوع" : "Type"}
          <select name="type">{types.map((type) => <option key={type} value={type}>{type}</option>)}</select>
        </label>
        <label>{ar ? "الرقم" : "Number"}<input name="identifier" /></label>
        <label>{ar ? "الانتهاء" : "Expiry"}<input type="date" name="expiryDate" /></label>
        <label>{ar ? "ملف" : "File"}<input type="file" name="file" accept="image/*,.pdf" required /></label>
        <button className="btn" type="submit">{m.save}</button>
      </form>
      <ul>
        {docs.map((doc) => (
          <li key={doc.id}>{doc.type} · {doc.status}{doc.expiryDate ? ` · ${doc.expiryDate}` : ""}</li>
        ))}
      </ul>
    </>
  );
}

import { Notice } from "@/components/notice";
import { requireDriver } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadDocument } from "@/server/actions/driver";
import { Steps, driverSteps } from "@/components/steps";

const types = [
  ["emirates_id", "Emirates ID", "الهوية"],
  ["licence", "Driving licence", "الرخصة"],
  ["permit", "Permit", "التصريح"],
  ["insurance", "Insurance", "التأمين"],
  ["photo_front", "Van, front", "المركبة من الأمام"],
  ["photo_back", "Van, back", "المركبة من الخلف"],
  ["photo_left", "Van, left", "المركبة من اليسار"],
  ["photo_right", "Van, right", "المركبة من اليمين"],
  ["photo_interior", "Inside the van", "داخل المركبة"],
  ["photo_plate", "Number plate", "اللوحة"],
  ["photo_selfie", "Your face", "وجهك"],
] as const;

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
  const ar = locale === "ar";
  const paperName = (type: string) => types.find((item) => item[0] === type)?.[ar ? 2 : 1] ?? type;
  return (
    <>
      <Steps labels={driverSteps(ar)} current={2} />
      <h1>{ar ? "أوراقك وصور المركبة" : "Your papers and van photos"}</h1>
      <p className="muted">{ar ? "ارفع الهوية والرخصة والتصريح والتأمين وصور المركبة. القيادة تبدأ بعد المراجعة." : "Upload your Emirates ID, licence, permit, insurance, and photos of the van. You can start a shift after review."}</p>
      <p><span className={`tag ${driver.status === "approved" ? "good" : "warn"}`}>{driver.status === "approved" ? (ar ? "مقبول" : "Approved") : driver.status === "submitted" ? (ar ? "بانتظار المراجعة" : "Waiting for review") : driver.status}</span></p>
      <Notice locale={locale} ok={query.ok} code={query.error} />
      <form className="stack card" action={uploadDocument}>
        <input type="hidden" name="locale" value={locale} />
        <label>{ar ? "ماذا ترفع؟" : "What are you uploading?"}
          <select name="type">{types.map(([type, en, nameAr]) => <option key={type} value={type}>{ar ? nameAr : en}</option>)}</select>
        </label>
        <label>{ar ? "الرقم" : "Number"}<input name="identifier" /></label>
        <label>{ar ? "الانتهاء" : "Expiry"}<input type="date" name="expiryDate" /></label>
        <label>{ar ? "ملف" : "File"}<input type="file" name="file" accept="image/*,.pdf" required /></label>
        <button className="btn" type="submit">{ar ? "ارفع هذا" : "Upload this"}</button>
      </form>
      <ul>
        {docs.map((doc) => (
          <li key={doc.id}>{paperName(doc.type)} · {doc.status === "valid" ? (ar ? "مقبول" : "Accepted") : doc.status === "rejected" ? (ar ? "مرفوض" : "Rejected") : (ar ? "بانتظار المراجعة" : "Waiting for review")}{doc.expiryDate ? ` · ${doc.expiryDate}` : ""}</li>
        ))}
      </ul>
    </>
  );
}

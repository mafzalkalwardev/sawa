import { AskPhoneAlert } from "@/components/update-notifier";
import { requireRider } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function RiderUpdates({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const customer = await requireRider(locale);
  const ar = locale === "ar";
  const rows = await prisma.rideUpdate.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  const unread = rows.filter((row) => !row.readAt).map((row) => row.id);
  if (unread.length) await prisma.rideUpdate.updateMany({ where: { id: { in: unread } }, data: { readAt: new Date() } });
  return (
    <>
      <h1>{ar ? "التحديثات" : "Updates"}</h1>
      <p className="muted">{ar ? "تظهر هنا داخل التطبيق. لا تُرسل رسالة نصية. تطبيق أندرويد ينبّه هذا الهاتف ما دام سوى مفتوحًا." : "These stay inside the app. No text message is sent. The Android app alerts this phone while Sawa is open."}</p>
      <AskPhoneAlert locale={locale} />
      {rows.length === 0 ? <p className="card">{ar ? "لا يوجد تحديث بعد." : "No update yet."}</p> : null}
      <div className="stack">
        {rows.map((row) => (
          <article key={row.id} className="card">
            <p>{ar ? row.bodyAr : row.bodyEn}</p>
            <p className="muted">{row.createdAt.toISOString().slice(0, 16).replace("T", " ")}</p>
          </article>
        ))}
      </div>
    </>
  );
}

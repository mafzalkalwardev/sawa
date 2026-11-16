import Link from "next/link";
import { Notice } from "@/components/notice";
import { t } from "@/i18n/copy";
import { requireRider } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { setCommuteStatus } from "@/server/actions/rider";

export default async function PassesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const customer = await requireRider(locale);
  const subs = await prisma.commuteSubscription.findMany({ where: { customerId: customer.id }, include: { route: true }, orderBy: { createdAt: "desc" } });
  const stops = await prisma.stop.findMany();
  const stopName = (id: string) => {
    const stop = stops.find((item) => item.id === id);
    return stop ? (locale === "ar" ? stop.nameAr : stop.nameEn) : "";
  };
  const m = t(locale);
  const ar = locale === "ar";
  return (
    <>
      <h1>{ar ? "كل يوم عمل" : "Every working day"}</h1>
      <p className="muted">{ar ? "الأحد إلى الخميس بالسعر المتفق عليه. الإيقاف يعني أنك غير متوقع حتى تشغّلها. رحلة اليوم المؤكدة تبقى." : "Sunday to Thursday at the agreed fare. Pause means you are not expected until you start it again. Today's confirmed ride stays."}</p>
      <Notice locale={locale} ok={query.ok} code={query.error} />
      {subs.length === 0 ? <p className="card">{ar ? "بعد أن تتفق مع السائق على رحلة شهرية، تظهر هنا." : "After you and a driver agree a monthly ride, it shows up here."}</p> : null}
      {subs.map((sub) => (
        <article key={sub.id} className="card">
          <h2>{ar ? sub.route.nameAr : sub.route.nameEn}</h2>
          <p>{stopName(sub.pickupStopId)} → {stopName(sub.dropStopId)}</p>
          <p>{sub.morningWindow} · {sub.eveningWindow}</p>
          <p className="price">{sub.priceAed} AED</p>
          <p>{sub.status === "active" ? (ar ? "تعمل" : "Running") : sub.status === "paused" ? (ar ? "متوقفة" : "Paused") : (ar ? "بانتظار الاتفاق" : "Waiting for an agreement")}</p>
          {sub.status === "active" ? (
            <form action={setCommuteStatus}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="subscriptionId" value={sub.id} />
              <input type="hidden" name="status" value="paused" />
              <button className="btn ghost" type="submit">{m.pause}</button>
            </form>
          ) : null}
          {sub.status === "paused" ? (
            <form action={setCommuteStatus}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="subscriptionId" value={sub.id} />
              <input type="hidden" name="status" value="active" />
              <button className="btn" type="submit">{m.resume}</button>
            </form>
          ) : null}
        </article>
      ))}
      <Link className="btn" href={`/${locale}/ride/book?product=monthly`}>{ar ? "اطلب رحلة كل يوم عمل" : "Ask for every working day"}</Link>
    </>
  );
}

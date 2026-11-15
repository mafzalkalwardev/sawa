import Link from "next/link";
import { Notice } from "@/components/notice";
import { t } from "@/i18n/copy";
import { requireRider } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { aed } from "@/lib/time";
import { setCommuteStatus } from "@/server/actions/rider";

export default async function PassesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const customer = await requireRider(locale);
  const subs = await prisma.commuteSubscription.findMany({ where: { customerId: customer.id }, include: { route: true } });
  const m = t(locale);
  const ar = locale === "ar";
  return (
    <>
      <h1>{m.passes}</h1>
      <Notice locale={locale} ok={query.ok} />
      {subs.length === 0 ? <p className="card">{ar ? "لا توجد باقة بعد." : "No pass yet."}</p> : null}
      {subs.map((sub) => (
        <article key={sub.id} className="card">
          <h2>{ar ? sub.route.nameAr : sub.route.nameEn}</h2>
          <p><span className="tag">{sub.status}</span> · {aed(sub.priceAed, locale)}</p>
          <p>{sub.morningWindow} / {sub.eveningWindow}</p>
          {sub.womenOnly ? <p>{m.womenOnly}</p> : null}
          {sub.status === "active" ? (
            <form action={setCommuteStatus}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="status" value="paused" />
              <button className="btn ghost" type="submit">{m.pause}</button>
            </form>
          ) : null}
          {sub.status === "paused" ? (
            <form action={setCommuteStatus}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="status" value="active" />
              <button className="btn" type="submit">{m.resume}</button>
            </form>
          ) : null}
        </article>
      ))}
      <p><Link className="btn" href={`/${locale}/ride/commute`}>{ar ? "ضبط البيت والعمل" : "Set home and work"}</Link></p>
      <p><Link href={`/${locale}/ride/book`}>{m.monthly}</Link></p>
    </>
  );
}

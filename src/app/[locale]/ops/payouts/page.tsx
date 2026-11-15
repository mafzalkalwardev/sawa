import { Notice } from "@/components/notice";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { preparePayout, setPayoutStatus } from "@/server/actions/ops";

export default async function PayoutsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  await requireStaff(locale);
  const payouts = await prisma.payout.findMany({ include: { operator: true }, orderBy: { createdAt: "desc" } });
  const operators = await prisma.operator.findMany();
  const ar = locale === "ar";
  return (
    <>
      <h1>{ar ? "مستحقات الشركاء" : "Partner payouts"}</h1>
      <Notice locale={locale} ok={query.ok} code={query.error} />
      <p className="muted">{ar ? "نسبة 70% افتراض تجريبي وليست عقدًا." : "The 70% share is a demo assumption, not a contract."}</p>
      {operators.map((operator) => (
        <form key={operator.id} action={preparePayout}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="operatorId" value={operator.id} />
          <button className="btn small" type="submit">{ar ? "تجهيز" : "Prepare"} {operator.name}</button>
        </form>
      ))}
      <table>
        <tbody>
          {payouts.map((payout) => (
            <tr key={payout.id}>
              <td>{payout.operator.name}</td>
              <td>{payout.period}</td>
              <td>{payout.amountAed}</td>
              <td>{payout.status}</td>
              <td>
                <form action={setPayoutStatus} className="row">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="payoutId" value={payout.id} />
                  <select name="status" defaultValue={payout.status}>
                    <option value="draft">draft</option>
                    <option value="approved">approved</option>
                    <option value="paid">paid</option>
                    <option value="disputed">disputed</option>
                  </select>
                  <button className="btn small" type="submit">{ar ? "حفظ" : "Save"}</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

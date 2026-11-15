import { Notice } from "@/components/notice";
import { t } from "@/i18n/copy";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { refundInvoice } from "@/server/actions/ops";

export default async function BillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  await requireStaff(locale);
  const invoices = await prisma.invoice.findMany({ include: { customer: true, payments: true, credits: true }, orderBy: { createdAt: "desc" } });
  const m = t(locale);
  return (
    <>
      <h1>{m.billing}</h1>
      <Notice locale={locale} ok={query.ok} code={query.error} />
      <p className="muted">{m.vatNote}</p>
      <table>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id}>
              <td>{invoice.customer?.fullName || "—"}</td>
              <td>{invoice.description}</td>
              <td>{invoice.amountAed}</td>
              <td>{invoice.status}</td>
              <td>{invoice.payments.map((payment) => payment.last4).join(", ")}</td>
              <td>
                {invoice.status === "paid" ? (
                  <form action={refundInvoice}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="invoiceId" value={invoice.id} />
                    <input name="reason" placeholder={m.reason} />
                    <button className="btn small" type="submit">{m.refund}</button>
                  </form>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

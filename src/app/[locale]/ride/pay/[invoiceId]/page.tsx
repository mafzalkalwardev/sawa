import { notFound, redirect } from "next/navigation";
import { Notice } from "@/components/notice";
import { t } from "@/i18n/copy";
import { requireRider } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { aed } from "@/lib/time";
import { payInvoice } from "@/server/actions/rider";

export default async function PayPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; invoiceId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale, invoiceId } = await params;
  const query = await searchParams;
  const customer = await requireRider(locale);
  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, customerId: customer.id } });
  if (!invoice) notFound();
  if (invoice.status === "paid") redirect(`/${locale}/ride?ok=paid`);
  const m = t(locale);
  return (
    <>
      <h1>{m.pay}</h1>
      <Notice locale={locale} code={query.error} />
      <p className="price">{aed(invoice.amountAed, locale)}</p>
      <p>{invoice.description}</p>
      <p className="muted">{m.vatNote}</p>
      <p className="muted">{m.demoHint}</p>
      <form className="stack" action={payInvoice}>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="invoiceId" value={invoice.id} />
        <label>{m.card}<input name="card" inputMode="numeric" autoComplete="off" placeholder="4242 4242 4242 4242" required /></label>
        <label>{m.expiry}<input name="expiry" autoComplete="off" placeholder="12/30" required /></label>
        <label>{m.cvc}<input name="cvc" inputMode="numeric" autoComplete="off" placeholder="123" required /></label>
        <button className="btn" type="submit">{m.pay}</button>
      </form>
    </>
  );
}

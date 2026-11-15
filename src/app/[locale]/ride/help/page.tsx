import { Notice } from "@/components/notice";
import { t } from "@/i18n/copy";
import { requireRider } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { openTicket } from "@/server/actions/rider";

export default async function HelpPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const customer = await requireRider(locale);
  const tickets = await prisma.ticket.findMany({ where: { customerId: customer.id }, orderBy: { createdAt: "desc" } });
  const m = t(locale);
  const ar = locale === "ar";
  return (
    <>
      <h1>{m.help}</h1>
      <Notice locale={locale} ok={query.ok} code={query.error} />
      <form className="stack" action={openTicket}>
        <input type="hidden" name="locale" value={locale} />
        <label>{ar ? "الموضوع" : "Subject"}<input name="subject" required /></label>
        <label>{ar ? "النوع" : "Kind"}
          <select name="kind">
            <option value="help">{m.help}</option>
            <option value="lost">{ar ? "مفقودات" : "Lost property"}</option>
            <option value="refund">{m.refund}</option>
          </select>
        </label>
        <label>{m.message}<textarea name="body" required /></label>
        <button className="btn" type="submit">{m.send}</button>
      </form>
      <div className="stack">
        {tickets.map((ticket) => (
          <article key={ticket.id} className="card">
            <h2>{ticket.subject}</h2>
            <p><span className="tag">{ticket.status}</span> · {ticket.priority}</p>
            <p>{ticket.body}</p>
          </article>
        ))}
      </div>
    </>
  );
}

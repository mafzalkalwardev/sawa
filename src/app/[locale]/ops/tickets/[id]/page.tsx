import { notFound } from "next/navigation";
import { Notice } from "@/components/notice";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateTicket } from "@/server/actions/ops";

export default async function TicketDetail({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const { locale, id } = await params;
  const query = await searchParams;
  await requireStaff(locale);
  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) notFound();
  const notes = await prisma.note.findMany({ where: { entityType: "ticket", entityId: id }, orderBy: { createdAt: "asc" } });
  return (
    <>
      <h1>{ticket.subject}</h1>
      <Notice locale={locale} ok={query.ok} />
      <p><span className="tag">{ticket.kind}</span> <span className="tag">{ticket.priority}</span> <span className="tag">{ticket.status}</span></p>
      <p>{ticket.body}</p>
      <ul>{notes.map((note) => <li key={note.id}>{note.authorName}: {note.text}</li>)}</ul>
      <form className="stack" action={updateTicket}>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="ticketId" value={ticket.id} />
        <select name="status" defaultValue={ticket.status}>
          <option value="open">open</option>
          <option value="pending">pending</option>
          <option value="resolved">resolved</option>
        </select>
        <textarea name="note" placeholder={locale === "ar" ? "ملاحظة داخلية" : "Internal note"} />
        <button className="btn" type="submit">{locale === "ar" ? "حفظ" : "Save"}</button>
      </form>
    </>
  );
}

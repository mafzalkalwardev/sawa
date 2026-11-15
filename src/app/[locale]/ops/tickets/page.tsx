import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function TicketsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireStaff(locale);
  const tickets = await prisma.ticket.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <>
      <h1>{locale === "ar" ? "التذاكر" : "Tickets"}</h1>
      <table>
        <tbody>
          {tickets.map((ticket) => (
            <tr key={ticket.id}>
              <td><Link href={`/${locale}/ops/tickets/${ticket.id}`}>{ticket.subject}</Link></td>
              <td>{ticket.kind}</td>
              <td><span className={`tag ${ticket.priority === "urgent" ? "bad" : ""}`}>{ticket.priority}</span></td>
              <td>{ticket.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

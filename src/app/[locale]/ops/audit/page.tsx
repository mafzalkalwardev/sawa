import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function AuditPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireStaff(locale);
  const events = await prisma.auditEvent.findMany({ orderBy: { createdAt: "desc" }, take: 150 });
  return (
    <>
      <h1>{locale === "ar" ? "السجل الرقابي" : "Audit log"}</h1>
      <table>
        <tbody>
          {events.map((event) => (
            <tr key={event.id}>
              <td>{event.createdAt.toISOString().slice(0, 16)}</td>
              <td>{event.actorName || event.actorId}</td>
              <td>{event.action}</td>
              <td>{event.entity}</td>
              <td>{event.afterJson}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

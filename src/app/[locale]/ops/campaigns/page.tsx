import { Notice } from "@/components/notice";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/roles";
import { createCampaign, openWhatsApp } from "@/server/actions/campaigns";

export default async function CampaignsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const staff = await requireStaff(locale);
  const ar = locale === "ar";
  const allowed = can(staff.role, "customers");
  const opted = await prisma.customer.count({ where: { whatsappOptIn: true, status: "active" } });
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { recipients: true },
  });
  const names = await prisma.customer.findMany({
    where: { id: { in: campaigns.flatMap((item) => item.recipients.map((person) => person.customerId)) } },
  });
  return (
    <>
      <h1>{ar ? "رسائل واتساب" : "WhatsApp messages"}</h1>
      <p className="muted">{ar ? "تصل فقط إلى الركاب الذين طلبوا واتساب. فتح واتساب لا يعني أنهم قرؤوا الرسالة." : "These go only to passengers who asked for WhatsApp. Opening WhatsApp does not mean they have read it."}</p>
      <Notice locale={locale} ok={query.ok} code={query.error} />
      <p>{ar ? `${opted} طلبوا الرسائل.` : `${opted} asked for messages.`}</p>
      {allowed ? (
        <form className="stack" action={createCampaign}>
          <input type="hidden" name="locale" value={locale} />
          <label>{ar ? "الرسالة" : "Message"}<textarea name="body" maxLength={400} required /></label>
          <button className="btn" type="submit">{ar ? "جهّز الرسائل" : "Prepare the messages"}</button>
        </form>
      ) : <p className="alert">{ar ? "صلاحيتك لا تسمح بإرسال الرسائل." : "Your role cannot send these messages."}</p>}
      {campaigns.map((campaign) => (
        <article key={campaign.id} className="card">
          <p>{campaign.body}</p>
          {campaign.recipients.map((person) => {
            const name = names.find((item) => item.id === person.customerId)?.fullName || person.phone;
            return (
              <form key={person.id} action={openWhatsApp}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="recipientId" value={person.id} />
                <button className="btn ghost" type="submit" disabled={!allowed}>
                  {name} · {person.status === "opened" ? (ar ? "فُتح واتساب" : "WhatsApp opened") : (ar ? "افتح واتساب" : "Open WhatsApp")}
                </button>
              </form>
            );
          })}
        </article>
      ))}
    </>
  );
}

"use server";

import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { nid } from "@/lib/ids";
import { can } from "@/lib/roles";

export async function createCampaign(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const staff = await requireStaff(locale);
  if (!can(staff.role, "customers")) redirect(`/${locale}/ops/campaigns?error=forbidden`);
  const body = String(formData.get("body") || "").trim().slice(0, 400);
  if (body.length < 2) redirect(`/${locale}/ops/campaigns?error=missing`);
  const people = await prisma.customer.findMany({
    where: { whatsappOptIn: true, status: "active", phone: { not: "" } },
  });
  if (!people.length) redirect(`/${locale}/ops/campaigns?error=optin`);
  const id = nid("cmp");
  await prisma.campaign.create({
    data: {
      id,
      staffId: staff.id,
      body,
      recipients: {
        create: people.map((person) => ({
          id: nid("rcp"),
          customerId: person.id,
          phone: person.phone,
          status: "waiting",
        })),
      },
    },
  });
  redirect(`/${locale}/ops/campaigns?ok=saved`);
}

export async function openWhatsApp(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const staff = await requireStaff(locale);
  if (!can(staff.role, "customers")) redirect(`/${locale}/ops?error=forbidden`);
  const recipientId = String(formData.get("recipientId") || "");
  const recipient = await prisma.campaignRecipient.findUnique({
    where: { id: recipientId },
    include: { campaign: true },
  });
  if (!recipient) redirect(`/${locale}/ops/campaigns?error=missing`);
  await prisma.campaignRecipient.update({ where: { id: recipient.id }, data: { status: "opened" } });
  const digits = recipient.phone.replace(/\D/g, "");
  const text = encodeURIComponent(recipient.campaign.body);
  redirect(`https://wa.me/${digits}?text=${text}`);
}

"use server";

import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { nid } from "@/lib/ids";
import { normalizePhone } from "@/lib/phone";
import { hashPassword } from "@/lib/password";
import { ROLES } from "@/lib/roles";
import { dubaiToday } from "@/lib/time";
import { buildPlan, confirmCluster } from "@/server/plan";
import { addNote, audit, driverDocsValid } from "@/server/records";

function back(locale: string, path: string, query: string): never {
  redirect(`/${locale}/ops${path}?${query}`);
}

export async function createDriver(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const staff = await requireStaff(locale, "drivers");
  const fullName = String(formData.get("fullName") || "").trim();
  const phone = normalizePhone(String(formData.get("phone") || ""));
  const operatorId = String(formData.get("operatorId") || "");
  if (!fullName || phone.length < 12 || !operatorId) back(locale, "/drivers/new", "error=missing");
  const id = nid("drv");
  await prisma.driver.create({
    data: {
      id,
      operatorId,
      fullName,
      displayName: fullName.split(" ")[0] || fullName,
      phone,
      email: String(formData.get("email") || "") || null,
      gender: String(formData.get("gender") || "unspecified"),
      nationality: String(formData.get("nationality") || "") || null,
      employmentType: String(formData.get("employmentType") || "partner"),
      status: "draft",
      baseLat: Number(formData.get("baseLat") || 25.2),
      baseLng: Number(formData.get("baseLng") || 55.27),
      baseAddress: String(formData.get("baseAddress") || ""),
      womenOnlyEligible: formData.get("womenOnlyEligible") === "on",
      preferredRouteIds: String(formData.get("preferredRouteIds") || ""),
      languages: String(formData.get("languages") || "ar,en"),
    },
  });
  await addNote({ entityType: "driver", entityId: id, authorId: staff.id, authorName: staff.name, text: "Enrolled by staff. Driver can finish documents in the app.", type: "enroll" });
  await audit({ actorId: staff.id, actorName: staff.name, action: "driver.create", entity: "driver", entityId: id });
  redirect(`/${locale}/ops/drivers/${id}?ok=saved`);
}

export async function reviewDriver(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const staff = await requireStaff(locale, "drivers");
  const driverId = String(formData.get("driverId") || "");
  const status = String(formData.get("status") || "");
  const allowed = ["approved", "needs_resubmission", "rejected", "suspended", "in_review"];
  if (!allowed.includes(status)) back(locale, `/drivers/${driverId}`, "error=missing");
  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) back(locale, "/drivers", "error=missing");
  if (status === "approved") {
    const valid = await driverDocsValid(driver.id, driver.defaultVehicleId);
    if (!valid) back(locale, `/drivers/${driverId}`, "error=docs");
  }
  await prisma.driver.update({
    where: { id: driver.id },
    data: { status, onShift: status === "approved" ? driver.onShift : false },
  });
  await audit({
    actorId: staff.id,
    actorName: staff.name,
    action: "driver.review",
    entity: "driver",
    entityId: driver.id,
    before: { status: driver.status },
    after: { status },
  });
  redirect(`/${locale}/ops/drivers/${driver.id}?ok=saved`);
}

export async function acceptDriverPapers(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const staff = await requireStaff(locale, "drivers");
  const driverId = String(formData.get("driverId") || "");
  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) back(locale, "/drivers", "error=missing");
  const docs = await prisma.document.findMany({
    where: {
      OR: [
        { ownerType: "driver", ownerId: driver.id },
        ...(driver.defaultVehicleId ? [{ ownerType: "vehicle", ownerId: driver.defaultVehicleId }] : []),
      ],
    },
    orderBy: { createdAt: "desc" },
  });
  const today = new Date().toISOString().slice(0, 10);
  const needed = [
    { type: "emirates_id", ownerType: "driver", ownerId: driver.id },
    { type: "licence", ownerType: "driver", ownerId: driver.id },
    { type: "permit", ownerType: "driver", ownerId: driver.id },
    ...(driver.defaultVehicleId ? [{ type: "insurance", ownerType: "vehicle", ownerId: driver.defaultVehicleId }] : []),
  ];
  const picked = [];
  for (const need of needed) {
    const doc = docs.find((item) => item.type === need.type && item.ownerType === need.ownerType && item.ownerId === need.ownerId && item.fileUrl && item.status !== "rejected" && (!item.expiryDate || item.expiryDate >= today));
    if (!doc) back(locale, `/drivers/${driver.id}`, "error=docs");
    picked.push(doc);
  }
  const reviewedAt = new Date();
  for (const doc of picked) {
    await prisma.document.update({ where: { id: doc.id }, data: { status: "approved", reviewerId: staff.id, reviewedAt } });
  }
  await prisma.driver.update({ where: { id: driver.id }, data: { status: "approved" } });
  await audit({
    actorId: staff.id,
    actorName: staff.name,
    action: "driver.accept",
    entity: "driver",
    entityId: driver.id,
    before: { status: driver.status },
    after: { status: "approved" },
  });
  redirect(`/${locale}/ops/drivers/${driver.id}?ok=saved`);
}

export async function createCustomer(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const staff = await requireStaff(locale, "customers");
  const fullName = String(formData.get("fullName") || "").trim();
  const phone = normalizePhone(String(formData.get("phone") || ""));
  if (!fullName || phone.length < 12) back(locale, "/customers/new", "error=missing");
  const id = nid("cus");
  await prisma.customer.create({
    data: {
      id,
      fullName,
      phone,
      email: String(formData.get("email") || "") || null,
      gender: String(formData.get("gender") || "unspecified"),
      corporateId: String(formData.get("corporateId") || "") || null,
      payerType: String(formData.get("payerType") || "self"),
      acquiredVia: "staff",
      status: "active",
      preference: {
        create: {
          id: nid("pref"),
          womenOnly: formData.get("womenOnly") === "on",
          accessibility: String(formData.get("accessibility") || "") || null,
        },
      },
    },
  });
  const routeId = String(formData.get("routeId") || "");
  const pickupStopId = String(formData.get("pickupStopId") || "");
  const dropStopId = String(formData.get("dropStopId") || "");
  if (routeId && pickupStopId && dropStopId && pickupStopId !== dropStopId) {
    const route = await prisma.route.findUnique({ where: { id: routeId } });
    const pickup = await prisma.stop.findUnique({ where: { id: pickupStopId } });
    const drop = await prisma.stop.findUnique({ where: { id: dropStopId } });
    if (route && pickup && drop) {
      await prisma.savedPlace.createMany({
        data: [
          { id: nid("plc"), customerId: id, kind: "home", label: "Home", address: pickup.nameEn, lat: pickup.lat, lng: pickup.lng, snappedStopId: pickup.id },
          { id: nid("plc"), customerId: id, kind: "work", label: "Work", address: drop.nameEn, lat: drop.lat, lng: drop.lng, snappedStopId: drop.id },
        ],
      });
      await prisma.commuteSubscription.create({
        data: {
          id: nid("sub"),
          customerId: id,
          routeId,
          pickupStopId,
          dropStopId,
          days: "0,1,2,3,4",
          morningWindow: "7:00–8:10",
          eveningWindow: "17:40–19:00",
          startDate: dubaiToday(),
          product: "monthly",
          status: "active",
          priceAed: route.monthlyPriceAed,
          womenOnly: formData.get("womenOnly") === "on",
        },
      });
    }
  }
  await audit({ actorId: staff.id, actorName: staff.name, action: "customer.create", entity: "customer", entityId: id });
  redirect(`/${locale}/ops/customers/${id}?ok=saved`);
}

export async function planDay(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  await requireStaff(locale, "assign");
  const serviceDate = String(formData.get("serviceDate") || dubaiToday());
  const shift = String(formData.get("shift") || "morning") === "evening" ? "evening" : "morning";
  const result = await buildPlan(serviceDate, shift);
  if (result.skipped) back(locale, "/plan", `date=${serviceDate}&shift=${shift}&error=weekend`);
  redirect(`/${locale}/ops/plan?date=${serviceDate}&shift=${shift}&ok=saved`);
}

export async function confirmRecommendation(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const staff = await requireStaff(locale, "assign");
  const clusterId = String(formData.get("clusterId") || "");
  const driverId = String(formData.get("driverId") || "");
  try {
    await confirmCluster({ clusterId, driverId, staffId: staff.id, staffName: staff.name, source: "recommended" });
  } catch (error) {
    back(locale, "/plan", `error=${encodeURIComponent(error instanceof Error ? error.message : "missing")}`);
  }
  redirect(`/${locale}/ops/plan?ok=assigned`);
}

export async function overrideAssignment(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const staff = await requireStaff(locale, "assign");
  const clusterId = String(formData.get("clusterId") || "");
  const driverId = String(formData.get("driverId") || "");
  const reason = String(formData.get("reason") || "").trim();
  if (!reason) back(locale, "/plan", "error=reason");
  try {
    await confirmCluster({ clusterId, driverId, staffId: staff.id, staffName: staff.name, reason, source: "override" });
  } catch (error) {
    back(locale, "/plan", `error=${encodeURIComponent(error instanceof Error ? error.message : "missing")}`);
  }
  redirect(`/${locale}/ops/plan?ok=assigned`);
}

export async function substituteDriver(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const staff = await requireStaff(locale, "assign");
  const runId = String(formData.get("runId") || "");
  const driverId = String(formData.get("driverId") || "");
  const reason = String(formData.get("reason") || "").trim();
  if (!reason) back(locale, `/trips/${runId}`, "error=reason");
  const run = await prisma.run.findUnique({ where: { id: runId } });
  const driver = await prisma.driver.findUnique({ where: { id: driverId }, include: { vehicles: true } });
  const vehicle = driver?.vehicles.find((item) => item.id === driver.defaultVehicleId) ?? driver?.vehicles[0];
  if (!run || !driver || !vehicle) back(locale, "/trips", "error=missing");
  await prisma.run.update({ where: { id: run.id }, data: { driverId: driver.id, vehicleId: vehicle.id } });
  await audit({
    actorId: staff.id,
    actorName: staff.name,
    action: "run.substitute",
    entity: "run",
    entityId: run.id,
    before: { driverId: run.driverId },
    after: { driverId: driver.id, reason },
  });
  redirect(`/${locale}/ops/trips/${run.id}?ok=assigned`);
}

export async function refundInvoice(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const staff = await requireStaff(locale, "refund");
  const invoiceId = String(formData.get("invoiceId") || "");
  const reason = String(formData.get("reason") || "").trim() || "Staff refund";
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice || invoice.status === "refunded") back(locale, "/billing", "error=missing");
  await prisma.invoice.update({ where: { id: invoice.id }, data: { status: "refunded" } });
  await prisma.creditNote.create({ data: { id: nid("crn"), invoiceId: invoice.id, amountAed: invoice.amountAed, reason } });
  await audit({ actorId: staff.id, actorName: staff.name, action: "invoice.refund", entity: "invoice", entityId: invoice.id, after: { reason } });
  redirect(`/${locale}/ops/billing?ok=saved`);
}

export async function setPayoutStatus(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const staff = await requireStaff(locale, "payouts");
  const payoutId = String(formData.get("payoutId") || "");
  const status = String(formData.get("status") || "approved");
  if (!["approved", "paid", "disputed", "draft"].includes(status)) back(locale, "/payouts", "error=missing");
  await prisma.payout.update({
    where: { id: payoutId },
    data: { status, approvedById: status === "approved" || status === "paid" ? staff.id : null },
  });
  await audit({ actorId: staff.id, actorName: staff.name, action: "payout.update", entity: "payout", entityId: payoutId, after: { status } });
  redirect(`/${locale}/ops/payouts?ok=saved`);
}

export async function preparePayout(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const staff = await requireStaff(locale, "payouts");
  const operatorId = String(formData.get("operatorId") || "");
  const operator = await prisma.operator.findUnique({ where: { id: operatorId } });
  if (!operator) back(locale, "/payouts", "error=missing");
  const completed = await prisma.booking.findMany({
    where: { status: "completed", run: { driver: { operatorId } } },
  });
  const amount = Math.round(completed.reduce((sum, booking) => sum + booking.priceAed, 0) * 0.7);
  await prisma.payout.create({
    data: {
      id: nid("pyo"),
      operatorId,
      period: dubaiToday(),
      amountAed: amount,
      status: "draft",
      note: "70% of completed seat fares. Demo commercial assumption, not a signed contract.",
    },
  });
  await audit({ actorId: staff.id, actorName: staff.name, action: "payout.prepare", entity: "operator", entityId: operatorId, after: { amount } });
  redirect(`/${locale}/ops/payouts?ok=saved`);
}

export async function updateTicket(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const staff = await requireStaff(locale, "tickets");
  const ticketId = String(formData.get("ticketId") || "");
  const status = String(formData.get("status") || "pending");
  await prisma.ticket.update({
    where: { id: ticketId },
    data: { status, assigneeId: staff.id, updatedAt: new Date() },
  });
  const note = String(formData.get("note") || "").trim();
  if (note) {
    await addNote({ entityType: "ticket", entityId: ticketId, authorId: staff.id, authorName: staff.name, text: note });
  }
  redirect(`/${locale}/ops/tickets/${ticketId}?ok=saved`);
}

export async function addStaffNote(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const staff = await requireStaff(locale, "notes");
  const entityType = String(formData.get("entityType") || "");
  const entityId = String(formData.get("entityId") || "");
  const text = String(formData.get("text") || "").trim();
  if (!text) back(locale, "", "error=missing");
  await addNote({ entityType, entityId, authorId: staff.id, authorName: staff.name, text });
  const path = entityType === "driver" ? `/drivers/${entityId}` : entityType === "customer" ? `/customers/${entityId}` : `/tickets/${entityId}`;
  redirect(`/${locale}/ops${path}?ok=saved`);
}

export async function createStaff(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const staff = await requireStaff(locale, "settings");
  const role = String(formData.get("role") || "readonly");
  if (!ROLES.includes(role as (typeof ROLES)[number])) back(locale, "/settings", "error=missing");
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const name = String(formData.get("name") || "").trim();
  const password = String(formData.get("password") || "");
  if (!email || !name || password.length < 8) back(locale, "/settings", "error=missing");
  const created = await prisma.staffUser.create({
    data: {
      id: nid("stf"),
      name,
      email,
      phone: normalizePhone(String(formData.get("phone") || "+971500000000")),
      role,
      passwordHash: hashPassword(password),
    },
  });
  await audit({ actorId: staff.id, actorName: staff.name, action: "staff.create", entity: "staff", entityId: created.id, after: { role, email } });
  redirect(`/${locale}/ops/settings?ok=saved`);
}

export async function previewImport(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const staff = await requireStaff(locale, "import");
  const csvText = String(formData.get("csv") || "");
  const lines = csvText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const rows = [];
  for (const line of lines.slice(lines[0]?.toLowerCase().startsWith("name,") ? 1 : 0)) {
    const [name, phoneRaw, routeSlug, pickupSlug, dropSlug, daysRaw] = line.split(",").map((part) => part.trim().replaceAll('"', ""));
    const days = (daysRaw || "0|1|2|3|4").replaceAll("|", ",");
    const phone = normalizePhone(phoneRaw || "");
    const route = routeSlug ? await prisma.route.findUnique({ where: { slug: routeSlug } }) : null;
    const pickup = route ? await prisma.stop.findFirst({ where: { routeId: route.id, slug: pickupSlug } }) : null;
    const drop = route ? await prisma.stop.findFirst({ where: { routeId: route.id, slug: dropSlug } }) : null;
    const duplicate = phone ? await prisma.customer.findUnique({ where: { phone } }) : null;
    const errors = [];
    if (!name) errors.push("Name is required.");
    if (phone.length < 12) errors.push("Phone is not a UAE number.");
    if (!route) errors.push("Unknown route slug.");
    if (!pickup || !drop) errors.push("Unknown stop slug.");
    if (pickup && drop && pickup.id === drop.id) errors.push("Pickup and drop match.");
    if (duplicate) errors.push("Phone already exists.");
    rows.push({ name, phone, routeSlug, pickupSlug, dropSlug, days: days || "0,1,2,3,4", errors });
  }
  const batch = await prisma.importBatch.create({
    data: { id: nid("imp"), staffId: staff.id, csvText, resultJson: JSON.stringify(rows), status: "preview" },
  });
  redirect(`/${locale}/ops/import?batch=${batch.id}`);
}

export async function commitImport(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const staff = await requireStaff(locale, "import");
  const batch = await prisma.importBatch.findUnique({ where: { id: String(formData.get("batchId") || "") } });
  if (!batch || batch.status !== "preview") back(locale, "/import", "error=missing");
  const rows = JSON.parse(batch.resultJson) as { name: string; phone: string; routeSlug: string; pickupSlug: string; dropSlug: string; days: string; errors: string[] }[];
  if (rows.some((row) => row.errors.length)) back(locale, `/import?batch=${batch.id}`, "error=missing");
  for (const row of rows) {
    const route = await prisma.route.findUniqueOrThrow({ where: { slug: row.routeSlug } });
    const pickup = await prisma.stop.findFirstOrThrow({ where: { routeId: route.id, slug: row.pickupSlug } });
    const drop = await prisma.stop.findFirstOrThrow({ where: { routeId: route.id, slug: row.dropSlug } });
    const id = nid("cus");
    await prisma.customer.create({
      data: {
        id,
        fullName: row.name,
        phone: row.phone,
        acquiredVia: "import",
        status: "active",
        preference: { create: { id: nid("pref") } },
      },
    });
    await prisma.savedPlace.createMany({
      data: [
        { id: nid("plc"), customerId: id, kind: "home", label: "Home", address: pickup.nameEn, lat: pickup.lat, lng: pickup.lng, snappedStopId: pickup.id },
        { id: nid("plc"), customerId: id, kind: "work", label: "Work", address: drop.nameEn, lat: drop.lat, lng: drop.lng, snappedStopId: drop.id },
      ],
    });
    await prisma.commuteSubscription.create({
      data: {
        id: nid("sub"),
        customerId: id,
        routeId: route.id,
        pickupStopId: pickup.id,
        dropStopId: drop.id,
        days: row.days,
        morningWindow: "7:00–8:10",
        eveningWindow: "17:40–19:00",
        startDate: dubaiToday(),
        product: "monthly",
        status: "active",
        priceAed: route.monthlyPriceAed,
      },
    });
    await prisma.invoice.create({
      data: {
        id: nid("inv"),
        customerId: id,
        amountAed: route.monthlyPriceAed,
        status: "open",
        description: `Imported monthly pass · ${route.nameEn}`,
        dueDate: dubaiToday(),
        note: "VAT is not applied in this demo.",
      },
    });
  }
  await prisma.importBatch.update({ where: { id: batch.id }, data: { status: "committed" } });
  await audit({ actorId: staff.id, actorName: staff.name, action: "import.commit", entity: "import", entityId: batch.id, after: { count: rows.length } });
  redirect(`/${locale}/ops/customers?ok=saved`);
}

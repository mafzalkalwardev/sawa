"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { clearSession, requireRider } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { nid, pinCode, shareToken } from "@/lib/ids";
import { hoursUntilShift } from "@/lib/time";
import { quoteToll } from "@/lib/tolls";
import { openChat } from "@/server/chat";
import { audit } from "@/server/records";
import { createRun } from "@/server/runs";

function coversRoute(preferred: string, slug: string) {
  return preferred.split(",").map((item) => item.trim()).includes(slug);
}

async function attachBooking(bookingId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return null;
  const pin = booking.pin || pinCode();
  const token = booking.shareToken || shareToken();
  const route = await prisma.route.findUnique({ where: { id: booking.routeId } });
  const runs = await prisma.run.findMany({
    where: {
      serviceDate: booking.serviceDate,
      shift: booking.shift,
      status: { in: ["scheduled", "live"] },
    },
    include: { vehicle: true, bookings: true, driver: true, route: true },
  });
  const fits = (run: (typeof runs)[number]) => {
    if (!route || run.route.slug !== route.slug) return false;
    if (!coversRoute(run.driver.preferredRouteIds, route.slug) && run.routeId !== route.id) return false;
    const others = run.bookings.filter((item) => ["confirmed", "boarded", "completed"].includes(item.status) && item.id !== booking.id);
    if (others.length >= run.vehicle.seatCapacity) return false;
    if (booking.rideMode === "private" && others.length > 0) return false;
    if (booking.rideMode !== "private" && others.some((item) => item.rideMode === "private")) return false;
    if (booking.womenOnly && !run.vehicle.ladiesLicensed) return false;
    if (!booking.womenOnly && run.vehicle.ladiesLicensed) return false;
    return true;
  };
  let run = runs.find(fits) ?? null;
  if (!run && route) {
    const drivers = await prisma.driver.findMany({
      where: { status: "approved" },
      include: { vehicles: true },
    });
    for (const driver of drivers) {
      if (!coversRoute(driver.preferredRouteIds, route.slug)) continue;
      const vehicle = driver.vehicles.find((item) => item.id === driver.defaultVehicleId && item.status === "active");
      if (!vehicle) continue;
      if (booking.womenOnly && !vehicle.ladiesLicensed) continue;
      if (!booking.womenOnly && vehicle.ladiesLicensed) continue;
      const already = runs.find((item) => item.driverId === driver.id);
      if (already) continue;
      const created = await createRun({
        routeId: route.id,
        driverId: driver.id,
        vehicleId: vehicle.id,
        serviceDate: booking.serviceDate,
        shift: booking.shift,
      });
      run = await prisma.run.findUnique({
        where: { id: created.id },
        include: { vehicle: true, bookings: true, driver: true, route: true },
      });
      break;
    }
  }
  await prisma.booking.update({
    where: { id: booking.id },
    data: { runId: run?.id ?? null, status: "confirmed", pin, shareToken: token },
  });
  if (run) await openChat(booking.id);
  return booking.id;
}

export async function saveProfile(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const customer = await requireRider(locale);
  const fullName = String(formData.get("fullName") || "").trim();
  if (fullName.length < 2) redirect(`/${locale}/ride/profile?error=missing`);
  const file = formData.get("photo");
  let photoUrl = customer.photoUrl;
  if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith("image/") || file.size > 5_000_000) redirect(`/${locale}/ride/profile?error=missing`);
    const { mkdir, writeFile } = await import("fs/promises");
    const path = await import("path");
    const safe = file.name.replace(/[^a-zA-Z0-9.]+/g, "-").slice(-40);
    const filename = `photo-${Date.now()}-${safe}`;
    const dir = path.join(process.cwd(), "data", "uploads", "riders", customer.id);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
    photoUrl = filename;
  }
  const idFile = formData.get("idDocument");
  let idDocumentUrl = customer.idDocumentUrl;
  if (idFile instanceof File && idFile.size > 0) {
    if (!idFile.type.startsWith("image/") || idFile.size > 5_000_000) redirect(`/${locale}/ride/profile?error=missing`);
    const { mkdir, writeFile } = await import("fs/promises");
    const path = await import("path");
    const idName = idFile.name.replace(/[^a-zA-Z0-9.]+/g, "-").slice(-40);
    const idFilename = `id-${Date.now()}-${idName}`;
    const dir = path.join(process.cwd(), "data", "uploads", "riders", customer.id);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, idFilename), Buffer.from(await idFile.arrayBuffer()));
    idDocumentUrl = idFilename;
  }
  const next = String(formData.get("next") || "");
  const safe = next.startsWith(`/${locale}/`) && !next.includes("://") && !next.includes("//") ? next : "";
  if (!photoUrl || !idDocumentUrl) redirect(`/${locale}/ride/profile?error=missing`);
  const womenOnly = formData.get("womenOnly") === "on";
  const accessibility = String(formData.get("accessibility") || "") || null;
  await prisma.customer.update({
    where: { id: customer.id },
    data: {
      fullName,
      email: String(formData.get("email") || "") || null,
      gender: String(formData.get("gender") || "unspecified"),
      language: locale === "ar" ? "ar" : "en",
      photoUrl,
      idDocumentUrl,
      emergencyName: String(formData.get("emergencyName") || "") || null,
      emergencyPhone: String(formData.get("emergencyPhone") || "") || null,
    },
  });
  await prisma.preference.upsert({
    where: { customerId: customer.id },
    update: { womenOnly, accessibility, quietRide: formData.get("quietRide") === "on" },
    create: { id: nid("pref"), customerId: customer.id, womenOnly, accessibility, quietRide: formData.get("quietRide") === "on" },
  });
  redirect(safe || `/${locale}/ride?ok=saved`);
}

export async function saveCommute(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const customer = await requireRider(locale);
  const routeId = String(formData.get("routeId") || "");
  const pickupStopId = String(formData.get("pickupStopId") || "");
  const dropStopId = String(formData.get("dropStopId") || "");
  const morningWindow = String(formData.get("morningWindow") || "7:00–8:10");
  const eveningWindow = String(formData.get("eveningWindow") || "17:40–19:00");
  if (!routeId || pickupStopId === dropStopId) redirect(`/${locale}/ride/commute?error=same`);
  const pickup = await prisma.stop.findUnique({ where: { id: pickupStopId } });
  const drop = await prisma.stop.findUnique({ where: { id: dropStopId } });
  if (!pickup || !drop || pickup.routeId !== routeId || drop.routeId !== routeId) redirect(`/${locale}/ride/commute?error=missing`);
  await prisma.savedPlace.deleteMany({ where: { customerId: customer.id, kind: { in: ["home", "work"] } } });
  await prisma.savedPlace.createMany({
    data: [
      { id: nid("plc"), customerId: customer.id, kind: "home", label: "Home", address: pickup.nameEn, lat: pickup.lat, lng: pickup.lng, snappedStopId: pickup.id },
      { id: nid("plc"), customerId: customer.id, kind: "work", label: "Work", address: drop.nameEn, lat: drop.lat, lng: drop.lng, snappedStopId: drop.id },
    ],
  });
  const existing = await prisma.commuteSubscription.findFirst({
    where: { customerId: customer.id, status: { in: ["active", "draft", "paused"] } },
  });
  const womenOnly = formData.get("womenOnly") === "on";
  const data = {
    routeId,
    pickupStopId,
    dropStopId,
    days: "0,1,2,3,4",
    morningWindow,
    eveningWindow,
    womenOnly,
  };
  if (existing) {
    await prisma.commuteSubscription.update({ where: { id: existing.id }, data });
  } else {
    const route = await prisma.route.findUniqueOrThrow({ where: { id: routeId } });
    await prisma.commuteSubscription.create({
      data: {
        id: nid("sub"),
        customerId: customer.id,
        ...data,
        startDate: String(formData.get("startDate") || new Date().toISOString().slice(0, 10)),
        product: "monthly",
        status: "draft",
        priceAed: route.monthlyPriceAed,
      },
    });
  }
  await prisma.preference.upsert({
    where: { customerId: customer.id },
    update: { womenOnly },
    create: { id: nid("pref"), customerId: customer.id, womenOnly },
  });
  redirect(`/${locale}/ride/passes?ok=saved`);
}

export async function setCommuteStatus(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const customer = await requireRider(locale);
  const status = String(formData.get("status") || "paused");
  await prisma.commuteSubscription.updateMany({
    where: { customerId: customer.id, status: { in: ["active", "paused"] } },
    data: { status: status === "active" ? "active" : "paused" },
  });
  if (status === "paused") {
    await prisma.customer.update({ where: { id: customer.id }, data: { status: "paused" } });
  } else {
    await prisma.customer.update({ where: { id: customer.id }, data: { status: "active" } });
  }
  redirect(`/${locale}/ride/passes?ok=saved`);
}

export async function createBooking(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const customer = await requireRider(locale);
  const routeId = String(formData.get("routeId") || "");
  const serviceDate = String(formData.get("serviceDate") || "");
  const shift = String(formData.get("shift") || "morning");
  const windowLabel = String(formData.get("windowLabel") || "");
  const pickupStopId = String(formData.get("pickupStopId") || "");
  const dropStopId = String(formData.get("dropStopId") || "");
  const product = String(formData.get("product") || "single") === "monthly" ? "monthly" : "single";
  const rideMode = String(formData.get("rideMode") || "shared") === "private" ? "private" : "shared";
  const womenOnly = formData.get("womenOnly") === "on";
  if (!routeId || !serviceDate || pickupStopId === dropStopId) redirect(`/${locale}/ride/book?error=same`);
  const route = await prisma.route.findUnique({ where: { id: routeId } });
  const pickup = await prisma.stop.findUnique({ where: { id: pickupStopId } });
  const drop = await prisma.stop.findUnique({ where: { id: dropStopId } });
  if (!route || !pickup || !drop || pickup.routeId !== route.id || drop.routeId !== route.id) {
    redirect(`/${locale}/ride/book?error=missing`);
  }
  const pass = await prisma.commuteSubscription.findFirst({
    where: { customerId: customer.id, routeId, status: "active", product: "monthly" },
  });
  const covered = product === "single" && Boolean(pass);
  const shared = product === "monthly" ? route.monthlyPriceAed : route.seatPriceAed;
  const alone = product === "monthly" ? route.monthlyPrivateAed : route.privatePriceAed;
  const stops = await prisma.stop.findMany({ where: { routeId: route.id } });
  const toll = quoteToll({
    routeSlug: route.slug,
    stops,
    pickupSlug: pickup.slug,
    dropSlug: drop.slug,
    serviceDate,
    windowLabel,
    rideMode,
    trips: product === "monthly" ? 22 : 1,
  });
  const fare = covered ? 0 : rideMode === "private" ? alone : shared;
  const price = fare + (covered ? 0 : toll.chargedAed);
  const tollNote = toll.lines.map((line) => `${line.nameEn} AED ${line.aed.toFixed(2)}`).join("; ");
  const invoice = covered
    ? null
    : await prisma.invoice.create({
        data: {
          id: nid("inv"),
          customerId: customer.id,
          corporateId: customer.corporateId,
          amountAed: price,
          vatAed: 0,
          status: "open",
          description: `${rideMode === "private" ? "Private vehicle" : "Shared seat"} · ${route.nameEn} · ${serviceDate}${tollNote ? ` · ${tollNote}` : ""}`,
          dueDate: serviceDate,
          note: "Seat fare plus the published Salik or Darb toll for the gates between these stops. Salik includes 5% VAT. The demo total is rounded to the nearest dirham.",
        },
      });
  const booking = await prisma.booking.create({
    data: {
      id: nid("bkg"),
      customerId: customer.id,
      routeId,
      serviceDate,
      shift,
      windowLabel,
      pickupStopId,
      dropStopId,
      product,
      rideMode,
      priceAed: price,
      status: covered ? "confirmed" : "pending_payment",
      womenOnly,
      invoiceId: invoice?.id,
      pin: covered ? pinCode() : null,
      shareToken: shareToken(),
    },
  });
  if (covered) {
    await attachBooking(booking.id);
    redirect(`/${locale}/ride/trip/${booking.id}?ok=paid`);
  }
  redirect(`/${locale}/ride/pay/${invoice!.id}`);
}

export async function payInvoice(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const customer = await requireRider(locale);
  const invoiceId = String(formData.get("invoiceId") || "");
  const card = String(formData.get("card") || "").replace(/\s/g, "");
  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, customerId: customer.id } });
  if (!invoice) redirect(`/${locale}/ride?error=missing`);
  if (!card.startsWith("4242424242424242")) redirect(`/${locale}/ride/pay/${invoiceId}?error=card`);
  if (invoice.status !== "paid") {
    await prisma.payment.create({
      data: {
        id: nid("pay"),
        invoiceId: invoice.id,
        amountAed: invoice.amountAed,
        status: "paid",
        last4: "4242",
        processorRef: `demo_${nid("psp")}`,
        method: "card",
      },
    });
    await prisma.invoice.update({ where: { id: invoice.id }, data: { status: "paid" } });
  }
  const booking = await prisma.booking.findFirst({ where: { invoiceId: invoice.id, customerId: customer.id } });
  if (booking?.product === "monthly") {
    const route = await prisma.route.findUnique({ where: { id: booking.routeId } });
    const existing = await prisma.commuteSubscription.findFirst({
      where: { customerId: customer.id, routeId: booking.routeId, status: { in: ["draft", "active", "paused"] } },
    });
    if (existing) {
      await prisma.commuteSubscription.update({
        where: { id: existing.id },
        data: { status: "active", priceAed: route?.monthlyPriceAed ?? existing.priceAed, womenOnly: booking.womenOnly },
      });
    } else if (route) {
      await prisma.commuteSubscription.create({
        data: {
          id: nid("sub"),
          customerId: customer.id,
          routeId: route.id,
          pickupStopId: booking.pickupStopId,
          dropStopId: booking.dropStopId,
          days: "0,1,2,3,4",
          morningWindow: booking.shift === "morning" ? booking.windowLabel : "7:00–8:10",
          eveningWindow: booking.shift === "evening" ? booking.windowLabel : "17:40–19:00",
          startDate: booking.serviceDate,
          product: "monthly",
          status: "active",
          priceAed: route.monthlyPriceAed,
          womenOnly: booking.womenOnly,
        },
      });
    }
  }
  if (booking) {
    await attachBooking(booking.id);
    redirect(`/${locale}/ride/trip/${booking.id}?ok=paid`);
  }
  redirect(`/${locale}/ride/passes?ok=paid`);
}

export async function cancelBooking(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const customer = await requireRider(locale);
  const bookingId = String(formData.get("bookingId") || "");
  const booking = await prisma.booking.findFirst({ where: { id: bookingId, customerId: customer.id } });
  if (!booking || ["cancelled", "completed", "boarded"].includes(booking.status)) redirect(`/${locale}/ride`);
  const early = hoursUntilShift(booking.serviceDate, booking.shift) > 2;
  await prisma.booking.update({ where: { id: booking.id }, data: { status: "cancelled", runId: null } });
  if (early && booking.invoiceId && booking.priceAed > 0) {
    const invoice = await prisma.invoice.findUnique({ where: { id: booking.invoiceId } });
    if (invoice && invoice.status === "paid") {
      await prisma.invoice.update({ where: { id: invoice.id }, data: { status: "refunded" } });
      await prisma.creditNote.create({
        data: { id: nid("crn"), invoiceId: invoice.id, amountAed: invoice.amountAed, reason: "Cancelled more than 2 hours before the shift." },
      });
    }
  }
  redirect(`/${locale}/ride?ok=saved`);
}

export async function rateTrip(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const customer = await requireRider(locale);
  const bookingId = String(formData.get("bookingId") || "");
  const rating = Number(formData.get("rating") || 0);
  const booking = await prisma.booking.findFirst({ where: { id: bookingId, customerId: customer.id }, include: { run: true } });
  if (!booking?.run || rating < 1 || rating > 5) redirect(`/${locale}/ride/history?error=missing`);
  await prisma.booking.update({
    where: { id: booking.id },
    data: { rating, ratingComment: String(formData.get("comment") || "") || null },
  });
  const rated = await prisma.booking.findMany({ where: { run: { driverId: booking.run.driverId }, rating: { not: null } } });
  const avg = rated.reduce((sum, item) => sum + (item.rating || 0), 0) / Math.max(1, rated.length);
  await prisma.driver.update({ where: { id: booking.run.driverId }, data: { ratingAvg: Math.round(avg * 10) / 10 } });
  redirect(`/${locale}/ride/history?ok=saved`);
}

export async function openTicket(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const customer = await requireRider(locale);
  const subject = String(formData.get("subject") || "").trim();
  const body = String(formData.get("body") || "").trim();
  if (!subject || !body) redirect(`/${locale}/ride/help?error=missing`);
  await prisma.ticket.create({
    data: {
      id: nid("tkt"),
      subject,
      body,
      requesterType: "customer",
      requesterId: customer.id,
      customerId: customer.id,
      runId: String(formData.get("runId") || "") || null,
      status: "open",
      priority: "normal",
      kind: String(formData.get("kind") || "help"),
    },
  });
  redirect(`/${locale}/ride/help?ok=sent`);
}

export async function sendSos(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const customer = await requireRider(locale);
  const bookingId = String(formData.get("bookingId") || "");
  const booking = await prisma.booking.findFirst({ where: { id: bookingId, customerId: customer.id }, include: { run: true } });
  if (!booking) redirect(`/${locale}/ride`);
  const openSos = await prisma.ticket.findFirst({
    where: { customerId: customer.id, runId: booking.runId, kind: "sos", status: "open" },
  });
  if (openSos) redirect(`/${locale}/ride/trip/${booking.id}?ok=sos`);
  const ticket = await prisma.ticket.create({
    data: {
      id: nid("tkt"),
      subject: `SOS · ${customer.fullName}`,
      body: "Rider used the in-app SOS. This is an operations alert, not a call to a public emergency service.",
      requesterType: "customer",
      requesterId: customer.id,
      customerId: customer.id,
      driverId: booking.run?.driverId,
      runId: booking.runId,
      status: "open",
      priority: "urgent",
      kind: "sos",
    },
  });
  await audit({
    actorId: customer.id,
    actorName: customer.fullName,
    action: "sos",
    entity: "ticket",
    entityId: ticket.id,
    after: { bookingId, runId: booking.runId },
  });
  redirect(`/${locale}/ride/trip/${booking.id}?ok=sos`);
}

export async function deleteAccount(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const customer = await requireRider(locale);
  const confirm = String(formData.get("confirm") || "");
  if (confirm !== "DELETE") redirect(`/${locale}/ride/settings?error=missing`);
  await prisma.customer.update({
    where: { id: customer.id },
    data: {
      status: "deleted",
      fullName: "Deleted rider",
      phone: `deleted-${customer.id}`,
      email: null,
      emergencyName: null,
      emergencyPhone: null,
      photoUrl: null,
      deletedAt: new Date(),
    },
  });
  await prisma.commuteSubscription.updateMany({ where: { customerId: customer.id }, data: { status: "cancelled" } });
  await audit({ actorId: customer.id, actorName: "Deleted rider", action: "account.delete", entity: "customer", entityId: customer.id });
  await clearSession();
  redirect(`/${locale}?ok=deleted`);
}

export async function setLargeType(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const jar = await cookies();
  const on = jar.get("sawa_large")?.value === "1";
  jar.set("sawa_large", on ? "0" : "1", { path: "/", maxAge: 60 * 60 * 24 * 365 });
  redirect(`/${locale}/ride/settings?ok=saved`);
}

export async function contactMessage(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const message = String(formData.get("message") || "").trim();
  if (!name || !message) redirect(`/${locale}/contact?error=missing`);
  await prisma.ticket.create({
    data: {
      id: nid("tkt"),
      subject: `Contact · ${name}`,
      body: message,
      requesterType: "public",
      status: "open",
      priority: "normal",
      kind: "contact",
    },
  });
  await prisma.communication.create({
    data: {
      id: nid("com"),
      channel: "email",
      template: "contact",
      toAddress: email || "unset",
      body: message,
      relatedType: "ticket",
      status: "logged",
    },
  });
  redirect(`/${locale}/contact?ok=sent`);
}

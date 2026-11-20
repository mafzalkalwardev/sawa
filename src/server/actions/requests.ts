"use server";

import { redirect } from "next/navigation";
import { getSession, requireDriver, requireRider } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { nid, pinCode, shareToken } from "@/lib/ids";
import { quoteToll } from "@/lib/tolls";
import { copyRequestChat, openChat } from "@/server/chat";
import { tellDriver, tellRider } from "@/server/updates";
import { holdsSeat, joinSharedPool, pooledFare, refreshPool } from "@/server/pool";
import { hoursUntilShift } from "@/lib/time";
import { priceForStops } from "@/server/stops";
import { createRun } from "@/server/runs";
import { creditReferral } from "@/server/wallet";

export async function requestRide(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const customer = await requireRider(locale);
  if (!customer.fullName || !customer.photoUrl || !customer.idDocumentUrl) redirect(`/${locale}/ride/profile`);
  const routeId = String(formData.get("routeId") || "");
  const serviceDate = String(formData.get("serviceDate") || "");
  const shift = String(formData.get("shift") || "morning");
  const windowLabel = String(formData.get("windowLabel") || "");
  const pickupStopId = String(formData.get("pickupStopId") || "");
  const dropStopId = String(formData.get("dropStopId") || "");
  const product = String(formData.get("product") || "single") === "monthly" ? "monthly" : "single";
  const rideMode = String(formData.get("rideMode") || "shared") === "private" ? "private" : "shared";
  const note = String(formData.get("note") || "").trim().slice(0, 240);
  const womenOnly = formData.get("womenOnly") === "on";
  if (!routeId || !serviceDate || pickupStopId === dropStopId) redirect(`/${locale}/ride/book?error=same`);
  const route = await prisma.route.findUnique({ where: { id: routeId } });
  const pickup = await prisma.stop.findUnique({ where: { id: pickupStopId } });
  const drop = await prisma.stop.findUnique({ where: { id: dropStopId } });
  if (!route || !pickup || !drop || pickup.routeId !== route.id || drop.routeId !== route.id) {
    redirect(`/${locale}/ride/book?error=missing`);
  }
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
  const fare = rideMode === "private"
    ? (product === "monthly" ? route.monthlyPrivateAed : route.privatePriceAed)
    : (product === "monthly" ? route.monthlyPriceAed : route.seatPriceAed);
  const listed = fare + toll.chargedAed;
  let poolId: string | null = null;
  let offerAed = listed;
  let driverId: string | null = null;
  let status = "queued";
  if (rideMode === "shared") {
    const already = await prisma.rideRequest.findFirst({
      where: {
        customerId: customer.id,
        routeId,
        serviceDate,
        shift,
        windowLabel,
        product,
        rideMode: "shared",
        status: { in: ["queued", "accepted", "agreed", "ordered", "waiting"] },
      },
    });
    if (already) redirect(`/${locale}/ride/book?error=seat`);
    const joined = await joinSharedPool({
      routeId,
      serviceDate,
      shift,
      windowLabel,
      product,
      womenOnly,
      listAed: listed,
      customerId: customer.id,
    });
    poolId = joined.pool.id;
    if (joined.waiting) {
      status = "waiting";
      driverId = null;
    } else {
      const riding = joined.pool.requests.filter((item) => holdsSeat(item.status));
      offerAed = pooledFare(joined.pool.listAed, riding.length + 1);
      if (joined.pool.driverId) {
        driverId = joined.pool.driverId;
        status = "accepted";
      }
    }
  }
  const request = await prisma.rideRequest.create({
    data: {
      id: nid("req"),
      customerId: customer.id,
      routeId,
      pickupStopId,
      dropStopId,
      serviceDate,
      shift,
      windowLabel,
      product,
      rideMode,
      poolId,
      note: note || null,
      status,
      driverId,
      offerAed: status === "waiting" ? null : offerAed,
      offeredBy: status === "waiting" ? null : "rider",
      riderAgreed: status !== "waiting",
    },
  });
  if (driverId) {
    await prisma.chatThread.upsert({
      where: { requestId: request.id },
      update: { driverId, customerId: customer.id },
      create: { id: nid("chat"), requestId: request.id, driverId, customerId: customer.id },
    });
  }
  if (poolId) await refreshPool(poolId);
  if (status === "waiting") {
    await tellRider(customer.id, "waitlist", "This van is full. You are on the waitlist.", "هذه المركبة ممتلئة. أنت على قائمة الانتظار.");
  }
  await prisma.preference.upsert({
    where: { customerId: customer.id },
    update: { womenOnly },
    create: { id: nid("pref"), customerId: customer.id, womenOnly },
  });
  redirect(`/${locale}/ride/requests/${request.id}`);
}

export async function acceptRequest(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const driver = await requireDriver(locale);
  const id = String(formData.get("requestId") || "");
  const request = await prisma.rideRequest.findUnique({ where: { id } });
  if (!request || request.status !== "queued") redirect(`/${locale}/drive`);
  const ids = request.poolId
    ? (await prisma.rideRequest.findMany({ where: { poolId: request.poolId, status: "queued" } })).map((item) => item.id)
    : [request.id];
  if (!ids.includes(request.id)) ids.push(request.id);
  await prisma.rideRequest.updateMany({ where: { id: { in: ids } }, data: { status: "accepted", driverId: driver.id } });
  if (request.poolId) await prisma.pool.update({ where: { id: request.poolId }, data: { driverId: driver.id } });
  const accepted = await prisma.rideRequest.findMany({ where: { id: { in: ids } } });
  for (const item of accepted) {
    await prisma.chatThread.upsert({
      where: { requestId: item.id },
      update: { driverId: driver.id, customerId: item.customerId },
      create: {
        id: nid("chat"),
        requestId: item.id,
        driverId: driver.id,
        customerId: item.customerId,
      },
    });
    const person = await prisma.customer.findUnique({ where: { id: item.customerId } });
    const first = person?.fullName.split(" ")[0] || "A passenger";
    await tellRider(item.customerId, "accepted", `${driver.displayName} accepted your ride request.`, `${driver.displayName} قبل طلب رحلتك.`);
    await tellDriver(driver.id, "accepted", `${first} is waiting for a price.`, `${first} بانتظار السعر.`);
  }
  redirect(`/${locale}/drive/requests/${id}`);
}

export async function proposeFare(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const id = String(formData.get("requestId") || "");
  const amount = Math.round(Number(formData.get("amount") || 0));
  const session = await getSession();
  const request = await prisma.rideRequest.findUnique({ where: { id } });
  if (!session || !request || amount < 1 || !["accepted", "agreed"].includes(request.status)) redirect(`/${locale}/app`);
  const rider = session.kind === "rider" && session.id === request.customerId;
  const driver = session.kind === "driver" && session.id === request.driverId;
  if (!rider && !driver) redirect(`/${locale}/app`);
  await prisma.rideRequest.update({
    where: { id },
    data: {
      offerAed: amount,
      offeredBy: rider ? "rider" : "driver",
      riderAgreed: rider,
      driverAgreed: driver,
      status: "accepted",
    },
  });
  if (rider && request.driverId) {
    await tellDriver(request.driverId, "price", `A new price was sent: ${amount} AED.`, `أُرسل سعر جديد: ${amount} درهم.`);
  }
  if (driver) {
    await tellRider(request.customerId, "price", `A new price was sent: ${amount} AED.`, `أُرسل سعر جديد: ${amount} درهم.`);
  }
  const base = rider ? "ride" : "drive";
  redirect(`/${locale}/${base}/requests/${id}`);
}

export async function agreeFare(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const id = String(formData.get("requestId") || "");
  const session = await getSession();
  const request = await prisma.rideRequest.findUnique({ where: { id } });
  if (!session || !request?.offerAed || request.status === "ordered") redirect(`/${locale}/app`);
  const rider = session.kind === "rider" && session.id === request.customerId;
  const driver = session.kind === "driver" && session.id === request.driverId;
  if (!rider && !driver) redirect(`/${locale}/app`);
  const riderAgreed = request.riderAgreed || rider;
  const driverAgreed = request.driverAgreed || driver;
  await prisma.rideRequest.update({
    where: { id },
    data: { riderAgreed, driverAgreed, status: riderAgreed && driverAgreed ? "agreed" : request.status },
  });
  if (riderAgreed && driverAgreed) {
    if (request.driverId) await tellDriver(request.driverId, "agreed", `The price is agreed: ${request.offerAed} AED.`, `تم الاتفاق على السعر: ${request.offerAed} درهم.`);
    await tellRider(request.customerId, "agreed", `The price is agreed: ${request.offerAed} AED.`, `تم الاتفاق على السعر: ${request.offerAed} درهم.`);
  }
  const base = rider ? "ride" : "drive";
  redirect(`/${locale}/${base}/requests/${id}`);
}

export async function createOrder(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const id = String(formData.get("requestId") || "");
  const session = await getSession();
  const request = await prisma.rideRequest.findUnique({ where: { id } });
  if (!session || !request || !request.driverId) redirect(`/${locale}/app`);
  if (request.status === "ordered" && request.bookingId) {
    if (session.kind === "driver" && session.id === request.driverId) redirect(`/${locale}/drive`);
    if (session.kind === "rider" && session.id === request.customerId) redirect(`/${locale}/ride/trip/${request.bookingId}?ok=booked`);
    redirect(`/${locale}/app`);
  }
  if (request.status !== "agreed" || !request.offerAed) redirect(`/${locale}/app`);
  const allowed = (session.kind === "rider" && session.id === request.customerId) || (session.kind === "driver" && session.id === request.driverId);
  if (!allowed) redirect(`/${locale}/app`);
  const driver = await prisma.driver.findUnique({ where: { id: request.driverId }, include: { vehicles: true } });
  const vehicle = driver?.vehicles.find((item) => item.id === driver.defaultVehicleId);
  if (!driver || !vehicle) redirect(`/${locale}/app`);
  let run = await prisma.run.findFirst({
    where: { driverId: driver.id, serviceDate: request.serviceDate, shift: request.shift, status: { not: "cancelled" } },
  });
  const back = session.kind === "driver" ? "drive" : "ride";
  if (run && run.routeId !== request.routeId) redirect(`/${locale}/${back}/requests/${id}?error=full`);
  if (!run) {
    run = await createRun({
      routeId: request.routeId,
      driverId: driver.id,
      vehicleId: vehicle.id,
      serviceDate: request.serviceDate,
      shift: request.shift,
    });
  }
  const place = async (item: typeof request) => {
    const placed = await prisma.$transaction(async (tx) => {
      const fresh = await tx.rideRequest.findUnique({ where: { id: item.id } });
      if (!fresh?.offerAed) return { booking: null, created: false };
      if (fresh.status === "ordered" && fresh.bookingId) {
        const booking = await tx.booking.findUnique({ where: { id: fresh.bookingId } });
        return { booking, created: false };
      }
      if (fresh.status !== "agreed") return { booking: null, created: false };
      const seat = await tx.vehicle.findUnique({ where: { id: run.vehicleId }, select: { seatCapacity: true } });
      const used = await tx.booking.count({ where: { runId: run.id, status: { in: ["confirmed", "boarded", "completed"] } } });
      if (used >= (seat?.seatCapacity ?? 0)) return { booking: null, created: false };
      const claimed = await tx.rideRequest.updateMany({ where: { id: fresh.id, status: "agreed" }, data: { status: "ordered" } });
      if (claimed.count !== 1) {
        const won = await tx.rideRequest.findUnique({ where: { id: fresh.id } });
        const booking = won?.bookingId ? await tx.booking.findUnique({ where: { id: won.bookingId } }) : null;
        return { booking, created: false };
      }
      const booking = await tx.booking.create({
        data: {
          id: nid("bkg"),
          customerId: fresh.customerId,
          runId: run.id,
          routeId: fresh.routeId,
          serviceDate: fresh.serviceDate,
          shift: fresh.shift,
          windowLabel: fresh.windowLabel,
          pickupStopId: fresh.pickupStopId,
          dropStopId: fresh.dropStopId,
          product: fresh.product,
          rideMode: fresh.rideMode,
          priceAed: fresh.offerAed,
          status: "confirmed",
          pin: pinCode(),
          shareToken: shareToken(),
        },
      });
      await tx.rideRequest.update({ where: { id: fresh.id }, data: { bookingId: booking.id } });
      return { booking, created: true };
    });
    if (!placed.booking || !placed.created) return placed.booking;
    const booking = placed.booking;
    await openChat(booking.id);
    if (item.product === "monthly") {
      const pref = await prisma.preference.findUnique({ where: { customerId: item.customerId } });
      const sub = await prisma.commuteSubscription.findFirst({
        where: { customerId: item.customerId, routeId: item.routeId, status: { in: ["draft", "active", "paused"] } },
      });
      const month = {
        pickupStopId: item.pickupStopId,
        dropStopId: item.dropStopId,
        morningWindow: item.shift === "morning" ? item.windowLabel : "7:00–8:10",
        eveningWindow: item.shift === "evening" ? item.windowLabel : "17:40–19:00",
        priceAed: booking.priceAed,
        womenOnly: pref?.womenOnly ?? false,
        status: "active",
        product: "monthly",
      };
      if (sub) await prisma.commuteSubscription.update({ where: { id: sub.id }, data: month });
      else {
        await prisma.commuteSubscription.create({
          data: {
            id: nid("sub"),
            customerId: item.customerId,
            routeId: item.routeId,
            days: "0,1,2,3,4",
            startDate: item.serviceDate,
            ...month,
          },
        });
      }
    }
    await copyRequestChat(item.id, booking.id);
    await creditReferral(item.customerId);
    const person = await prisma.customer.findUnique({ where: { id: item.customerId } });
    const first = person?.fullName.split(" ")[0] || "A passenger";
    await tellRider(item.customerId, "confirmed", `Your ride is confirmed. Pickup number ${booking.pin}.`, `رحلتك مؤكدة. رقم الركوب ${booking.pin}.`, booking.id);
    await tellDriver(driver.id, "confirmed", `${first} is confirmed. Pickup number ${booking.pin}.`, `${first} مؤكد. رقم الركوب ${booking.pin}.`, booking.id);
    return booking;
  };
  const booking = await place(request);
  if (!booking) redirect(`/${locale}/${back}/requests/${id}?error=full`);
  if (request.poolId) {
    const siblings = await prisma.rideRequest.findMany({
      where: { poolId: request.poolId, status: "agreed", driverId: driver.id, id: { not: request.id } },
    });
    for (const sibling of siblings) await place(sibling);
    await prisma.pool.update({ where: { id: request.poolId }, data: { driverId: driver.id } });
    await refreshPool(request.poolId);
  }
  if (session.kind === "driver") redirect(`/${locale}/drive`);
  redirect(`/${locale}/ride/trip/${booking.id}?ok=booked`);
}

export async function withdrawRequest(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const customer = await requireRider(locale);
  const id = String(formData.get("requestId") || "");
  const request = await prisma.rideRequest.findFirst({ where: { id, customerId: customer.id } });
  if (!request || request.status === "ordered" || request.status === "cancelled") redirect(`/${locale}/ride`);
  const holding = holdsSeat(request.status);
  if (holding && hoursUntilShift(request.serviceDate, request.shift) <= 2) {
    redirect(`/${locale}/ride/requests/${id}?error=late`);
  }
  await prisma.rideRequest.update({ where: { id: request.id }, data: { status: "cancelled" } });
  if (request.poolId) await refreshPool(request.poolId);
  const person = customer.fullName.split(" ")[0] || "A passenger";
  if (request.driverId) {
    await tellDriver(request.driverId, "cancel", `${person} released this seat.`, `${person} ألغى هذا المقعد.`);
  }
  await tellRider(customer.id, "cancel", "Your request is cancelled.", "أُلغي طلبك.");
  redirect(`/${locale}/ride?ok=cancelled`);
}

export async function changeRequestStops(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const customer = await requireRider(locale);
  const id = String(formData.get("requestId") || "");
  const request = await prisma.rideRequest.findFirst({ where: { id, customerId: customer.id } });
  if (!request || !["queued", "accepted", "agreed", "waiting"].includes(request.status)) redirect(`/${locale}/ride`);
  if (request.status !== "waiting" && hoursUntilShift(request.serviceDate, request.shift) <= 2) {
    redirect(`/${locale}/ride/requests/${id}?error=late`);
  }
  const next = await priceForStops({
    routeId: request.routeId,
    serviceDate: request.serviceDate,
    windowLabel: request.windowLabel,
    product: request.product,
    rideMode: request.rideMode,
    pickupStopId: request.pickupStopId,
    dropStopId: request.dropStopId,
    nextPickupId: String(formData.get("pickupStopId") || ""),
    nextDropId: String(formData.get("dropStopId") || ""),
    priceAed: request.offerAed ?? 0,
  });
  if (!next) redirect(`/${locale}/ride/requests/${id}?error=missing`);
  if (next.error === "same") redirect(`/${locale}/ride/requests/${id}?error=same`);
  if (next.error === "unchanged") redirect(`/${locale}/ride/requests/${id}`);
  const offerAed = request.offerAed == null ? null : next.priceAed;
  await prisma.rideRequest.update({
    where: { id: request.id },
    data: { pickupStopId: next.pickup.id, dropStopId: next.drop.id, offerAed },
  });
  const en = `${next.pickup.nameEn} → ${next.drop.nameEn}.`;
  const arText = `${next.pickup.nameAr} → ${next.drop.nameAr}.`;
  await tellRider(customer.id, "stops", `Your stops are updated. ${en}`, `تم تحديث الموقفين. ${arText}`);
  if (request.driverId) {
    const first = customer.fullName.split(" ")[0] || "A passenger";
    await tellDriver(request.driverId, "stops", `${first} changed the stops. ${en}`, `${first} غيّر الموقفين. ${arText}`);
  }
  redirect(`/${locale}/ride/requests/${id}?ok=changed`);
}

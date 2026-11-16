"use server";

import { redirect } from "next/navigation";
import { getSession, requireDriver, requireRider } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { nid, pinCode, shareToken } from "@/lib/ids";
import { quoteToll } from "@/lib/tolls";
import { openChat } from "@/server/chat";
import { createRun } from "@/server/runs";

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
      note: note || null,
      status: "queued",
      offerAed: fare + toll.chargedAed,
      offeredBy: "rider",
      riderAgreed: true,
    },
  });
  redirect(`/${locale}/ride/requests/${request.id}`);
}

export async function acceptRequest(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const driver = await requireDriver(locale);
  const id = String(formData.get("requestId") || "");
  const request = await prisma.rideRequest.findUnique({ where: { id } });
  if (!request || request.status !== "queued") redirect(`/${locale}/drive`);
  await prisma.rideRequest.update({ where: { id }, data: { status: "accepted", driverId: driver.id } });
  await prisma.chatThread.upsert({
    where: { requestId: id },
    update: { driverId: driver.id, customerId: request.customerId },
    create: {
      id: nid("chat"),
      requestId: id,
      driverId: driver.id,
      customerId: request.customerId,
    },
  });
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
  const base = rider ? "ride" : "drive";
  redirect(`/${locale}/${base}/requests/${id}`);
}

export async function createOrder(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const id = String(formData.get("requestId") || "");
  const session = await getSession();
  const request = await prisma.rideRequest.findUnique({ where: { id } });
  if (!session || !request || request.status !== "agreed" || !request.driverId || !request.offerAed) redirect(`/${locale}/app`);
  const allowed = (session.kind === "rider" && session.id === request.customerId) || (session.kind === "driver" && session.id === request.driverId);
  if (!allowed) redirect(`/${locale}/app`);
  const driver = await prisma.driver.findUnique({ where: { id: request.driverId }, include: { vehicles: true } });
  const vehicle = driver?.vehicles.find((item) => item.id === driver.defaultVehicleId);
  if (!driver || !vehicle) redirect(`/${locale}/app`);
  let run = await prisma.run.findFirst({
    where: { driverId: driver.id, serviceDate: request.serviceDate, shift: request.shift, status: { not: "cancelled" } },
  });
  if (run && run.routeId !== request.routeId) redirect(`/${locale}/ride/requests/${id}?error=full`);
  if (!run) {
    run = await createRun({
      routeId: request.routeId,
      driverId: driver.id,
      vehicleId: vehicle.id,
      serviceDate: request.serviceDate,
      shift: request.shift,
    });
  }
  const booking = await prisma.booking.create({
    data: {
      id: nid("bkg"),
      customerId: request.customerId,
      runId: run.id,
      routeId: request.routeId,
      serviceDate: request.serviceDate,
      shift: request.shift,
      windowLabel: request.windowLabel,
      pickupStopId: request.pickupStopId,
      dropStopId: request.dropStopId,
      product: request.product,
      rideMode: request.rideMode,
      priceAed: request.offerAed,
      status: "confirmed",
      pin: pinCode(),
      shareToken: shareToken(),
    },
  });
  await openChat(booking.id);
  await prisma.rideRequest.update({ where: { id }, data: { status: "ordered", bookingId: booking.id } });
  if (session.kind === "driver") redirect(`/${locale}/drive`);
  redirect(`/${locale}/ride/trip/${booking.id}?ok=booked`);
}

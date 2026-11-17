"use server";

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { redirect } from "next/navigation";
import { requireDriver } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { haversineKm } from "@/lib/geo";
import { drive, onRoad, stepAlongRoad } from "@/server/routing";
import { nid } from "@/lib/ids";
import { dubaiToday } from "@/lib/time";
import { driverDocsValid } from "@/server/records";

export async function uploadDocument(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const driver = await requireDriver(locale);
  const type = String(formData.get("type") || "");
  const file = formData.get("file");
  const allowed = ["emirates_id", "licence", "permit", "insurance", "photo_front", "photo_back", "photo_left", "photo_right", "photo_interior", "photo_plate", "photo_selfie"];
  if (!allowed.includes(type) || !(file instanceof File) || file.size === 0 || file.size > 5_000_000) {
    redirect(`/${locale}/drive/documents?error=missing`);
  }
  const safe = file.name.replace(/[^a-zA-Z0-9.]+/g, "-").slice(-40);
  const dir = path.join(process.cwd(), "data", "uploads", driver.id);
  await mkdir(dir, { recursive: true });
  const filename = `${type}-${Date.now()}-${safe}`;
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
  await prisma.document.create({
    data: {
      id: nid("doc"),
      ownerType: type === "insurance" && driver.defaultVehicleId ? "vehicle" : "driver",
      ownerId: type === "insurance" && driver.defaultVehicleId ? driver.defaultVehicleId : driver.id,
      type,
      identifier: String(formData.get("identifier") || "") || null,
      expiryDate: String(formData.get("expiryDate") || "") || null,
      status: "submitted",
      fileUrl: filename,
    },
  });
  if (driver.status === "draft" || driver.status === "needs_resubmission") {
    await prisma.driver.update({ where: { id: driver.id }, data: { status: "submitted" } });
  }
  redirect(`/${locale}/drive/documents?ok=saved`);
}

export async function startShift(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const driver = await requireDriver(locale);
  const valid = await driverDocsValid(driver.id, driver.defaultVehicleId);
  if (driver.status !== "approved" || !valid) redirect(`/${locale}/drive?error=shift`);
  await prisma.driver.update({
    where: { id: driver.id },
    data: { onShift: true, shiftStartedAt: new Date() },
  });
  const run = await prisma.run.findFirst({
    where: { driverId: driver.id, serviceDate: dubaiToday(), status: { in: ["scheduled", "live"] } },
    orderBy: { shift: "asc" },
  });
  if (run && run.status === "scheduled") {
    await prisma.run.update({ where: { id: run.id }, data: { status: "live", startedAt: new Date() } });
  }
  redirect(`/${locale}/drive/shift`);
}

export async function endShift(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const driver = await requireDriver(locale);
  await prisma.driver.update({ where: { id: driver.id }, data: { onShift: false } });
  redirect(`/${locale}/drive?ok=saved`);
}

export async function dropPassenger(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const driver = await requireDriver(locale);
  const bookingId = String(formData.get("bookingId") || "");
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, status: "boarded", run: { driverId: driver.id, status: { in: ["scheduled", "live"] } } },
  });
  if (!booking) redirect(`/${locale}/drive/shift?error=missing`);
  await prisma.booking.update({ where: { id: booking.id }, data: { status: "completed" } });
  redirect(`/${locale}/drive/shift?ok=dropped`);
}

export async function completeRun(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const driver = await requireDriver(locale);
  const runId = String(formData.get("runId") || "");
  const run = await prisma.run.findFirst({ where: { id: runId, driverId: driver.id } });
  if (!run) redirect(`/${locale}/drive`);
  const stillWaiting = await prisma.booking.count({ where: { runId: run.id, status: "confirmed" } });
  await prisma.booking.updateMany({ where: { runId: run.id, status: "boarded" }, data: { status: "completed" } });
  if (stillWaiting > 0) redirect(`/${locale}/drive/shift?error=waiting`);
  await prisma.run.update({ where: { id: run.id }, data: { status: "completed", endedAt: new Date() } });
  await prisma.driver.update({
    where: { id: driver.id },
    data: { onShift: false, completedTrips: { increment: 1 } },
  });
  redirect(`/${locale}/drive/history?ok=saved`);
}

export async function boardWithPin(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const driver = await requireDriver(locale);
  const pin = String(formData.get("pin") || "").trim();
  const run = await prisma.run.findFirst({
    where: { driverId: driver.id, serviceDate: dubaiToday(), status: { in: ["scheduled", "live"] } },
  });
  if (!run) redirect(`/${locale}/drive/shift?error=missing`);
  const booking = await prisma.booking.findFirst({ where: { runId: run.id, pin, status: "confirmed" } });
  if (!booking) redirect(`/${locale}/drive/shift?error=pin`);
  await prisma.boarding.create({
    data: {
      id: nid("brd"),
      runId: run.id,
      bookingId: booking.id,
      customerId: booking.customerId,
      stopId: booking.pickupStopId,
      method: "pin",
      result: "boarded",
    },
  });
  await prisma.booking.update({ where: { id: booking.id }, data: { status: "boarded" } });
  if (run.status === "scheduled") {
    await prisma.run.update({ where: { id: run.id }, data: { status: "live", startedAt: new Date() } });
    await prisma.driver.update({ where: { id: driver.id }, data: { onShift: true, shiftStartedAt: driver.shiftStartedAt ?? new Date() } });
  }
  redirect(`/${locale}/drive/shift?ok=boarded`);
}

export async function markNoShow(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const driver = await requireDriver(locale);
  const bookingId = String(formData.get("bookingId") || "");
  const booking = await prisma.booking.findFirst({ where: { id: bookingId }, include: { run: true } });
  if (!booking?.run || booking.run.driverId !== driver.id) redirect(`/${locale}/drive/shift?error=missing`);
  await prisma.boarding.create({
    data: {
      id: nid("brd"),
      runId: booking.run.id,
      bookingId: booking.id,
      customerId: booking.customerId,
      stopId: booking.pickupStopId,
      method: "name",
      result: "no_show",
    },
  });
  await prisma.booking.update({ where: { id: booking.id }, data: { status: "no_show" } });
  redirect(`/${locale}/drive/shift?ok=saved`);
}

export async function arriveStop(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const driver = await requireDriver(locale);
  const eventId = String(formData.get("eventId") || "");
  const event = await prisma.stopEvent.findUnique({ where: { id: eventId }, include: { run: true } });
  if (!event || event.run.driverId !== driver.id) redirect(`/${locale}/drive/shift?error=missing`);
  await prisma.stopEvent.update({ where: { id: event.id }, data: { status: "arrived", arrivedAt: new Date() } });
  const stop = await prisma.stop.findUnique({ where: { id: event.stopId } });
  if (stop) {
    await prisma.driver.update({
      where: { id: driver.id },
      data: { liveLat: stop.lat, liveLng: stop.lng, liveAt: new Date() },
    });
    await prisma.locationPing.create({
      data: { id: nid("png"), driverId: driver.id, lat: stop.lat, lng: stop.lng, source: "arrival" },
    });
  }
  redirect(`/${locale}/drive/shift?ok=saved`);
}

export async function reportDelay(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const driver = await requireDriver(locale);
  const runId = String(formData.get("runId") || "");
  const note = String(formData.get("note") || "").trim();
  const run = await prisma.run.findFirst({ where: { id: runId, driverId: driver.id } });
  if (!run || !note) redirect(`/${locale}/drive/shift?error=missing`);
  await prisma.run.update({ where: { id: run.id }, data: { delayNote: note } });
  redirect(`/${locale}/drive/shift?ok=saved`);
}

export async function reportIncident(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const driver = await requireDriver(locale);
  const body = String(formData.get("body") || "").trim();
  const runId = String(formData.get("runId") || "") || null;
  if (!body) redirect(`/${locale}/drive/shift?error=missing`);
  await prisma.ticket.create({
    data: {
      id: nid("tkt"),
      subject: `Incident · ${driver.displayName}`,
      body,
      requesterType: "driver",
      requesterId: driver.id,
      driverId: driver.id,
      runId,
      status: "open",
      priority: "urgent",
      kind: "incident",
    },
  });
  await prisma.driver.update({ where: { id: driver.id }, data: { incidents: { increment: 1 } } });
  redirect(`/${locale}/drive/shift?ok=sent`);
}

export async function simulateLocation(formData: FormData) {
  const locale = String(formData.get("locale") || "en");
  const driver = await requireDriver(locale);
  if (!driver.onShift) redirect(`/${locale}/drive?error=shift`);
  const run = await prisma.run.findFirst({
    where: { driverId: driver.id, status: "live" },
    include: { stopEvents: { orderBy: { sequence: "asc" } } },
  });
  if (!run) redirect(`/${locale}/drive/shift?error=missing`);
  const nextEvent = run.stopEvents.find((event) => event.status !== "arrived") ?? run.stopEvents[run.stopEvents.length - 1];
  const stop = nextEvent ? await prisma.stop.findUnique({ where: { id: nextEvent.stopId } }) : null;
  if (!stop) redirect(`/${locale}/drive/shift?error=missing`);
  const stops = await prisma.stop.findMany({ where: { routeId: run.routeId }, orderBy: { sequence: "asc" } });
  const road = await drive(stops);
  const reported = { lat: driver.liveLat ?? driver.baseLat ?? stop.lat, lng: driver.liveLng ?? driver.baseLng ?? stop.lng };
  const from = onRoad(reported, road.path) ? reported : { lat: stops[0]?.lat ?? stop.lat, lng: stops[0]?.lng ?? stop.lng };
  const next = stepAlongRoad(road.path, from, 3);
  await prisma.driver.update({ where: { id: driver.id }, data: { liveLat: next.lat, liveLng: next.lng, liveAt: new Date() } });
  await prisma.locationPing.create({ data: { id: nid("png"), driverId: driver.id, lat: next.lat, lng: next.lng, source: "simulator" } });
  const km = haversineKm(next, stop);
  redirect(`/${locale}/drive/shift?ok=saved&moved=${Math.round(km * 10) / 10}`);
}

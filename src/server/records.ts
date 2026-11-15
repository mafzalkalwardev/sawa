import { prisma } from "@/lib/db";
import { nid } from "@/lib/ids";

export async function audit(opts: {
  actorId?: string | null;
  actorName?: string | null;
  action: string;
  entity: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}) {
  await prisma.auditEvent.create({
    data: {
      id: nid("aud"),
      actorId: opts.actorId ?? null,
      actorName: opts.actorName ?? null,
      action: opts.action,
      entity: opts.entity,
      entityId: opts.entityId,
      beforeJson: opts.before === undefined ? null : JSON.stringify(opts.before),
      afterJson: opts.after === undefined ? null : JSON.stringify(opts.after),
    },
  });
}

export async function addNote(opts: {
  entityType: string;
  entityId: string;
  authorId?: string | null;
  authorName: string;
  text: string;
  type?: string;
}) {
  await prisma.note.create({
    data: {
      id: nid("note"),
      entityType: opts.entityType,
      entityId: opts.entityId,
      authorId: opts.authorId ?? null,
      authorName: opts.authorName,
      text: opts.text,
      type: opts.type ?? "note",
    },
  });
}

const CRITICAL = new Set(["emirates_id", "licence", "insurance", "permit"]);

export function isCriticalDoc(type: string) {
  return CRITICAL.has(type);
}

export async function driverDocsValid(driverId: string, vehicleId?: string | null) {
  const docs = await prisma.document.findMany({
    where: {
      OR: [
        { ownerType: "driver", ownerId: driverId },
        ...(vehicleId ? [{ ownerType: "vehicle" as const, ownerId: vehicleId }] : []),
      ],
    },
  });
  const today = new Date().toISOString().slice(0, 10);
  const ok = (type: string, ownerType: string, ownerId: string) =>
    docs.some(
      (d) =>
        d.type === type &&
        d.ownerType === ownerType &&
        d.ownerId === ownerId &&
        d.status === "approved" &&
        (!d.expiryDate || d.expiryDate >= today),
    );
  const driverOk = ok("emirates_id", "driver", driverId) && ok("licence", "driver", driverId) && ok("permit", "driver", driverId);
  if (!vehicleId) return driverOk;
  return driverOk && ok("insurance", "vehicle", vehicleId);
}

export async function enforceDocumentExpiry() {
  const today = new Date().toISOString().slice(0, 10);
  const docs = await prisma.document.findMany({
    where: { expiryDate: { not: null }, status: { notIn: ["rejected", "expired"] } },
  });
  for (const doc of docs) {
    if (!doc.expiryDate || doc.expiryDate >= today || !isCriticalDoc(doc.type)) continue;
    await prisma.document.update({ where: { id: doc.id }, data: { status: "expired" } });
    if (doc.ownerType === "driver") {
      await prisma.driver.update({
        where: { id: doc.ownerId },
        data: { status: "expired", onShift: false },
      });
    }
    if (doc.ownerType === "vehicle") {
      await prisma.vehicle.update({ where: { id: doc.ownerId }, data: { status: "blocked" } });
      await prisma.driver.updateMany({
        where: { defaultVehicleId: doc.ownerId, status: "approved" },
        data: { status: "expired", onShift: false },
      });
    }
  }
}

import { prisma } from "@/lib/db";
import { nid } from "@/lib/ids";

export async function tellRider(customerId: string, kind: string, bodyEn: string, bodyAr: string, bookingId?: string) {
  await prisma.rideUpdate.create({
    data: { id: nid("upd"), customerId, bookingId, kind, bodyEn, bodyAr },
  });
}

export async function tellDriver(driverId: string, kind: string, bodyEn: string, bodyAr: string, bookingId?: string) {
  await prisma.rideUpdate.create({
    data: { id: nid("upd"), driverId, bookingId, kind, bodyEn, bodyAr },
  });
}

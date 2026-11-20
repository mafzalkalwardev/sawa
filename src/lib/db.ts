import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; sqliteReady?: boolean };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

if (!globalForPrisma.sqliteReady) {
  globalForPrisma.sqliteReady = true;
  void prisma.$queryRawUnsafe("PRAGMA journal_mode=WAL").catch(() => undefined);
  void prisma.$queryRawUnsafe("PRAGMA busy_timeout=5000").catch(() => undefined);
}

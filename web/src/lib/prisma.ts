// web/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["query"], // Geliştirme aşamasında SQL sorgularını terminalde görmek için
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

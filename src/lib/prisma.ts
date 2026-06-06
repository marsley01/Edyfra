import { PrismaClient } from "../generated/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
        ? `${process.env.DATABASE_URL}${process.env.DATABASE_URL.includes('?') ? '&' : '?'}connection_limit=5&pool_timeout=10`
        : "postgresql://localhost:5432/postgres?connect_timeout=1",
    },
  },
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;

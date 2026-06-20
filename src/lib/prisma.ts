import { PrismaClient } from "../generated/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function validateDatabaseUrl(url: string | undefined): string {
  if (!url) {
    throw new Error("DATABASE_URL is not defined. Please check your environment variables.");
  }
  if (!url.startsWith("postgresql://") && !url.startsWith("postgres://")) {
    throw new Error(`Invalid DATABASE_URL scheme. Must start with postgresql:// or postgres://. Got: ${url.substring(0, 30)}...`);
  }
  return url;
}

const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  datasources: {
    db: {
      url: validateDatabaseUrl(process.env.DATABASE_URL),
    },
  },
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;

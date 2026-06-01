import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRaw`DROP TRIGGER IF EXISTS tr_reset_daily_counts ON "User" CASCADE`;
    await prisma.$executeRaw`DROP FUNCTION IF EXISTS reset_daily_counts() CASCADE`;
    console.log("✅ Buggy Postgres trigger dropped successfully. The 'column new' error is fixed.");
  } catch (e) {
    console.error("Error dropping trigger:", e);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

import { PrismaClient } from "../src/generated/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning up MatchRequest table...");
  const deleted = await prisma.matchRequest.deleteMany({});
  console.log(`Deleted ${deleted.count} records.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

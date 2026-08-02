import { PrismaClient } from "../src/generated/client";

const prisma = new PrismaClient({
  log: ["error"],
  datasources: {
    db: { url: process.env.DATABASE_URL },
  },
});

async function main() {
  try {
    const existing = await prisma.user.findUnique({
      where: { username: "johndoe" },
      select: { id: true },
    });
    console.log("findUnique result:", existing);
  } catch (e) {
    console.error("findUnique ERROR:", (e as any).message);
  }

  try {
    const found = await prisma.user.findFirst({
      where: { username: "johndoe" },
      select: { id: true },
    });
    console.log("findFirst result:", found);
  } catch (e) {
    console.error("findFirst ERROR:", (e as any).message);
  }

  await prisma.$disconnect();
}

main();
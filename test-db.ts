import prisma from "./src/lib/prisma.ts";

async function run() {
  const entry = await prisma.platformSettings.findUnique({
    where: { key: "global" },
    select: { value: true },
  });
  console.log("DB Global Settings:", entry);
}

run();

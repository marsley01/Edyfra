/**
 * Creates an Edyfra API key for an external platform.
 *
 * Usage:
 *   npx tsx scripts/create-api-key.ts --name "Kenya Library System" --platform kenyalibrarysystem --scopes resources,tutors,stats
 */
import { PrismaClient } from "@/generated/client";
import crypto from "crypto";

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const getArg = (name: string) => {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return undefined;
  const next = args[idx + 1];
  if (!next || next.startsWith("--")) return true as unknown as string;
  return next;
};

async function main() {
  const name = getArg("name") || "External Platform";
  const platform = getArg("platform") || "external";
  const scopes = (getArg("scopes") || "resources,tutors,stats")
    .split(",")
    .filter((s) => ["resources", "tutors", "stats"].includes(s));
  const createdByEmail = getArg("createdBy") || "mashmarsley@gmail.com";

  const owner = await prisma.user.findFirst({
    where: { email: createdByEmail },
    select: { id: true },
  });

  if (!owner) {
    console.error(`No user found with email "${createdByEmail}".`);
    process.exit(1);
  }

  const rawKey = `edyfra_${crypto.randomBytes(24).toString("base64url")}`;
  const keyPrefix = rawKey.slice(0, 16);
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

  const record = await prisma.apiKey.create({
    data: {
      name,
      platform,
      keyHash,
      keyPrefix,
      scopes,
      createdBy: owner.id,
    },
  });

  console.log("\n=== API Key Created ===\n");
  console.log(`Name:     ${record.name}`);
  console.log(`Platform: ${record.platform}`);
  console.log(`Scopes:   ${record.scopes.join(", ")}`);
  console.log(`Key ID:   ${record.id}`);
  console.log(`\nYour API key (store it safely, shown once):`);
  console.log(`\n${rawKey}\n`);
  console.log("Usage:");
  console.log(`  curl -H "Authorization: Bearer ${rawKey}" ${process.env.NEXT_PUBLIC_APP_URL || "https://edyfra.com"}/api/external/v1/stats`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

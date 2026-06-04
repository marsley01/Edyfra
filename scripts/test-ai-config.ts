import prisma from "@/lib/prisma";

/**
 * Test script to check AI configuration
 * Run: npx tsx scripts/test-ai-config.ts
 */

async function testAIConfig() {
  console.log("🔍 Testing AI Configuration...\n");

  // 1. Check environment variables
  console.log("1️⃣  Environment Variables:");
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const googleKey = process.env.GOOGLE_AI_KEY;
  
  if (openrouterKey) {
    console.log(`   ✅ OPENROUTER_API_KEY is set (${openrouterKey.substring(0, 10)}...)`);
  } else {
    console.log(`   ❌ OPENROUTER_API_KEY is NOT set`);
  }

  if (googleKey) {
    console.log(`   ✅ GOOGLE_AI_KEY is set (${googleKey.substring(0, 10)}...)`);
  } else {
    console.log(`   ⚠️  GOOGLE_AI_KEY is not set (OK if using OpenRouter)`);
  }

  // 2. Check database settings
  console.log("\n2️⃣  Database Settings (platformSettings table):");
  try {
    const settings = await prisma.platformSettings.findUnique({
      where: { key: "global" },
      select: { value: true },
    });

    if (settings?.value) {
      const val = settings.value as Record<string, any>;
      console.log(`   - aiProvider: ${val.aiProvider || "NOT SET"}`);
      console.log(`   - googleAiKey: ${val.googleAiKey ? `SET (${val.googleAiKey.substring(0, 10)}...)` : "NOT SET"}`);
    } else {
      console.log(`   ⚠️  platformSettings not found`);
    }
  } catch (err: any) {
    console.log(`   ❌ Failed to query database: ${err.message}`);
  }

  // 3. Determine which provider would be used
  console.log("\n3️⃣  Provider Detection:");
  let finalKey = openrouterKey;
  let finalProvider = "openrouter";

  if (!finalKey) {
    try {
      const settings = await prisma.platformSettings.findUnique({
        where: { key: "global" },
        select: { value: true },
      });
      const val = settings?.value as Record<string, any>;
      finalKey = val?.googleAiKey;
      finalProvider = val?.aiProvider || "openrouter";
    } catch {}
  }

  if (finalKey?.startsWith("AIzaSy")) {
    finalProvider = "gemini";
  }

  if (finalKey) {
    console.log(`   ✅ Using provider: ${finalProvider}`);
    console.log(`   ✅ API Key configured: ${finalKey.substring(0, 10)}...`);
  } else {
    console.log(`   ❌ NO API KEY FOUND - AI WILL NOT WORK`);
    console.log(`\n   Fix: Add OPENROUTER_API_KEY to .env.local`);
  }

  // 4. Summary
  console.log("\n4️⃣  Summary:");
  if (finalKey) {
    console.log(`   ✅ AI is configured and should work`);
    console.log(`   📝 Mention @mash in study room to test`);
    console.log(`   🔍 Check server logs for [AIService] and [handleMashMention] messages`);
  } else {
    console.log(`   ❌ AI is NOT configured - you'll only get hardcoded responses`);
    console.log(`\n   To fix:`);
    console.log(`   1. Get an API key from https://openrouter.ai/`);
    console.log(`   2. Add to .env.local: OPENROUTER_API_KEY=your_key_here`);
    console.log(`   3. Restart your dev server`);
    console.log(`   4. Test again`);
  }

  await prisma.$disconnect();
}

testAIConfig().catch(console.error);

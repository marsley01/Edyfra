/**
 * Direct test of OpenRouter API with the provided key
 * Run: npx tsx scripts/test-openrouter-direct.ts
 */

import OpenAI from "openai";

async function testOpenRouter() {
  const apiKey = "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";

  console.log("🧪 Testing OpenRouter API directly...\n");
  console.log(`Using key: ${apiKey.substring(0, 20)}...`);
  console.log(`Provider: openrouter`);
  console.log(`Model: openai/gpt-4o-mini`);
  console.log("");

  const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: apiKey,
    defaultHeaders: {
      "HTTP-Referer": "https://edyfra-v2.vercel.app",
      "X-Title": "Edyfra",
    },
  });

  try {
    console.log("📤 Sending test request...");
    const completion = await openai.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful tutor." },
        { role: "user", content: "What is binary search?" },
      ],
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content;
    console.log("\n✅ SUCCESS!");
    console.log(`\n📝 Response from OpenRouter:\n${response}`);
    console.log("\n🎉 API key is VALID and working!");
  } catch (error: any) {
    console.error("\n❌ FAILED!");
    console.error(`Error Code: ${error.code}`);
    console.error(`Status: ${error.status}`);
    console.error(`Message: ${error.message}`);
    
    if (error.status === 401) {
      console.error("\n⚠️  API Key is INVALID or expired");
    } else if (error.status === 429) {
      console.error("\n⚠️  Rate limited - try again later");
    } else if (error.status === 400) {
      console.error("\n⚠️  Bad request - check model name");
    } else {
      console.error("\n⚠️  Network or server error");
    }

    if (error.error?.message) {
      console.error(`\nOpenRouter says: ${error.error.message}`);
    }
  }
}

testOpenRouter().catch(console.error);

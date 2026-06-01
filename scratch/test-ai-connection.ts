import * as dotenv from "dotenv";
dotenv.config();

import { AIService } from "../src/utils/ai-service";

async function testAI() {
  console.log("🚀 Testing Mash AI Connection...");
  console.log("Using API Key:", process.env.OPENROUTER_API_KEY?.substring(0, 10) + "...");

  const testPrompt = "Hello Mash, I'm stuck on a quadratic equation: x^2 - 5x + 6 = 0. Can you help?";
  const systemPrompt = "You are Mash AI, a supportive Kenyan tutor.";

  try {
    const response = await AIService.generateCompletion(testPrompt, systemPrompt);
    console.log("\n--- Mash AI Response ---");
    console.log(response);
    console.log("------------------------\n");
    
    if (response.includes("API key is configured") || response.includes("trouble thinking")) {
      console.error("❌ Test Failed: AI returned an error message.");
    } else {
      console.log("✅ Test Successful! Mash AI is online.");
    }
  } catch (error) {
    console.error("❌ Test Crashed:", error);
  }
}

testAI();

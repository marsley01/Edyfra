import { AIService } from "./src/utils/ai-service.ts";
import "dotenv/config";

async function run() {
  console.log("Testing AI Service...");
  const res = await AIService.generateCompletion("Hello! Are you working?");
  console.log("Response:", res);
}

run();

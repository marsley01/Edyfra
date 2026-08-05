import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
  console.warn(
    "[Gemini] GEMINI_API_KEY is missing. AI features will fall back to offline messages."
  );
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const getGeminiModel = (model = "gemini-1.5-flash") =>
  genAI.getGenerativeModel({ model });

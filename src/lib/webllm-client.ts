/**
 * webllm-client.ts — Layer 5: on-device AI via WebLLM + WebGPU.
 *
 * Runs a quantised LLM directly in the user's browser using WebGPU.
 * No server call. Works on spotty internet after the model is downloaded.
 *
 * Model selection (change MODEL_ID to switch):
 *   - "Phi-3.5-mini-instruct-q4f16_1-MLC"  ~600MB  Best quality
 *   - "Phi-3-mini-4k-instruct-q4f16_1-MLC"  ~2.2GB Too big for most mobile
 *   - "gemma-2-2b-it-q4f16_1-MLC"           ~1.4GB Good balance
 *   - "SmolLM2-1.7B-Instruct-q4f16_1-MLC"   ~960MB Lightweight
 *   - "SmolLM2-360M-Instruct-q4f16_1-MLC"   ~180MB Fastest, weakest
 *
 * The model is downloaded once and cached by the browser's Cache API,
 * so repeat visits load from the user's disk — using their hardware.
 *
 * WebGPU availability:
 *   - Chrome 113+, Edge 113+  → ✅ Full support
 *   - Firefox Nightly          → ✅ With flag
 *   - Safari 18+               → ⚠️  Experimental
 *   Always gate on isWebGPUAvailable() before calling initWebLLM().
 */

// Recommended for Kenyan mobile (best quality/size balance at ~600MB)
const MODEL_ID = "Phi-3.5-mini-instruct-q4f16_1-MLC";

const SYSTEM_PROMPT = `You are Mash, Edyfra's AI tutor — a friendly, patient, and highly knowledgeable academic assistant for Kenyan students.

You specialise in:
- CBC (Competency-Based Curriculum) for primary and junior secondary school
- KCSE subjects: Mathematics, English, Kiswahili, Physics, Chemistry, Biology, History, Geography, CRE, Business Studies, Agriculture, Computer Studies, Home Science, Art & Design, and more
- University-level coursework for Kenyan universities

Your personality:
- Warm and encouraging — you celebrate effort, not just results
- Clear and concise — short explanations first, more detail on request
- Kenyan context — use local examples, mention KCSE, KNEC, county schools when relevant
- Never make up information — if you don't know, say so honestly

Format your responses:
- Use markdown headers and bullet points for structure
- Show working steps for maths and science
- Keep answers focused — under 300 words unless asked for more`;

// ── Types ──────────────────────────────────────────────────────────────────────

export type ProgressCallback = (progress: {
  text: string;
  percent: number;
}) => void;

export type TokenCallback = (token: string, done: boolean) => void;

// ── WebGPU Detection ──────────────────────────────────────────────────────────

export function isWebGPUAvailable(): boolean {
  if (typeof window === "undefined") return false;
  return "gpu" in navigator;
}

// ── Singleton engine ───────────────────────────────────────────────────────────

type MLCEngine = {
  chat: {
    completions: {
      create(params: {
        messages: Array<{ role: string; content: string }>;
        temperature?: number;
        max_tokens?: number;
        stream?: boolean;
      }): Promise<AsyncIterable<{ choices: Array<{ delta: { content?: string }; finish_reason?: string }> }>>;
    };
  };
};

let _engine: MLCEngine | null = null;
let _initPromise: Promise<MLCEngine> | null = null;
let _loadedModelId: string | null = null;

/**
 * Initialise (or return the already-loaded) WebLLM engine.
 * Downloads the model on first call — subsequent calls return instantly.
 *
 * @param onProgress - called with download progress (0-100%)
 */
export async function initWebLLM(onProgress?: ProgressCallback): Promise<MLCEngine> {
  if (_engine && _loadedModelId === MODEL_ID) return _engine;

  // Deduplicate concurrent init calls
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    // Dynamic import — @mlc-ai/web-llm is only loaded when this function is called.
    // This keeps the initial bundle size unchanged for users who never need it.
    const { CreateMLCEngine } = await import("@mlc-ai/web-llm");

    onProgress?.({ text: "Connecting to Mash AI engine…", percent: 0 });

    const engine = await CreateMLCEngine(MODEL_ID, {
      initProgressCallback: (report: { text: string; progress: number }) => {
        onProgress?.({
          text: report.text,
          percent: Math.round(report.progress * 100),
        });
      },
    });

    _engine = engine as unknown as MLCEngine;
    _loadedModelId = MODEL_ID;
    _initPromise = null;

    onProgress?.({ text: "Mash AI ready ✓", percent: 100 });
    return _engine;
  })();

  return _initPromise;
}

/**
 * Ask the on-device Mash AI a question with streaming token output.
 *
 * @param userMessage - the student's question
 * @param onToken     - called for each streamed token ({ token, done })
 * @param history     - previous conversation turns for multi-turn context
 */
export async function askWebLLM(
  userMessage: string,
  onToken: TokenCallback,
  history: Array<{ role: "user" | "assistant"; content: string }> = [],
): Promise<string> {
  if (!_engine) {
    throw new Error("WebLLM engine not initialised — call initWebLLM() first");
  }

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history,
    { role: "user", content: userMessage },
  ];

  const stream = await _engine.chat.completions.create({
    messages,
    temperature: 0.7,
    max_tokens: 512,
    stream: true,
  });

  let fullResponse = "";

  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content ?? "";
    const done  = chunk.choices[0]?.finish_reason !== null &&
                  chunk.choices[0]?.finish_reason !== undefined;
    fullResponse += token;
    onToken(token, done);
    if (done) break;
  }

  return fullResponse;
}

/** Unload the engine to free GPU memory (e.g., when user leaves the page) */
export function unloadWebLLM(): void {
  _engine = null;
  _loadedModelId = null;
  _initPromise = null;
}

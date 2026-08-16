"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  isWebGPUAvailable,
  initWebLLM,
  askWebLLM,
  unloadWebLLM,
} from "@/lib/webllm-client";

export type MashAISource = "device" | "server" | "initializing" | "unavailable";

export interface MashAIMessage {
  role: "user" | "assistant";
  content: string;
  source?: MashAISource;
}

export interface MashAIState {
  /** Whether WebGPU is available in this browser */
  isSupported: boolean;
  /** Whether the model is currently downloading/loading */
  isLoading: boolean;
  /** Download progress 0-100 */
  loadProgress: number;
  /** Human-readable progress message */
  loadMessage: string;
  /** Whether the model is fully loaded and ready */
  isReady: boolean;
  /** Whether a response is being streamed */
  isStreaming: boolean;
  /** Current AI source */
  source: MashAISource;
  /** Error message if loading/inference failed */
  error: string | null;
}

/**
 * useMashAILocal — Layer 5: on-device Mash AI hook.
 *
 * Detects WebGPU support, manages model loading lifecycle, and routes
 * student questions to the on-device model or server fallback.
 *
 * Usage:
 *   const { ask, state, messages } = useMashAILocal();
 *
 *   // Trigger model load (call once, e.g., on component mount or button click)
 *   await loadModel();
 *
 *   // Ask a question
 *   const response = await ask("Explain photosynthesis");
 *
 * The hook automatically falls back to server-side AI if WebGPU is
 * unavailable or if the model fails to load.
 */
export function useMashAILocal(
  /** Server-side fallback: called when WebLLM is unavailable/failed */
  serverFallback?: (
    message: string,
    history: MashAIMessage[],
    onToken: (token: string, done: boolean) => void,
  ) => Promise<void>,
) {
  const [state, setState] = useState<MashAIState>({
    isSupported: false,
    isLoading: false,
    loadProgress: 0,
    loadMessage: "",
    isReady: false,
    isStreaming: false,
    source: "unavailable",
    error: null,
  });

  const [messages, setMessages] = useState<MashAIMessage[]>([]);
  const engineReady = useRef(false);

  // Detect WebGPU support on mount
  useEffect(() => {
    const supported = isWebGPUAvailable();
    setState((s) => ({
      ...s,
      isSupported: supported,
      source: supported ? "initializing" : "server",
    }));
  }, []);

  // Unload engine when the component unmounts to free GPU memory
  useEffect(() => {
    return () => {
      if (engineReady.current) {
        unloadWebLLM();
        engineReady.current = false;
      }
    };
  }, []);

  /**
   * Trigger model download + initialisation.
   * Safe to call multiple times — deduplicates internally.
   */
  const loadModel = useCallback(async () => {
    if (!state.isSupported || engineReady.current) return;

    setState((s) => ({
      ...s,
      isLoading: true,
      loadProgress: 0,
      loadMessage: "Starting download…",
      error: null,
    }));

    try {
      await initWebLLM((progress) => {
        setState((s) => ({
          ...s,
          loadProgress: progress.percent,
          loadMessage: progress.text,
        }));
      });

      engineReady.current = true;
      setState((s) => ({
        ...s,
        isLoading: false,
        isReady: true,
        source: "device",
        loadMessage: "Ready",
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load model";
      engineReady.current = false;
      setState((s) => ({
        ...s,
        isLoading: false,
        isReady: false,
        source: "server",
        error: message,
        loadMessage: "Falling back to server AI",
      }));
    }
  }, [state.isSupported]);

  /**
   * Ask Mash AI a question.
   * Routes to on-device model if ready, otherwise server fallback.
   * Returns the full response string.
   */
  const ask = useCallback(
    async (userMessage: string): Promise<string> => {
      // Add user message to history
      const userMsg: MashAIMessage = { role: "user", content: userMessage };
      const updatedHistory = [...messages, userMsg];
      setMessages(updatedHistory);

      setState((s) => ({ ...s, isStreaming: true, error: null }));

      // Placeholder for streaming assistant message
      const assistantMsg: MashAIMessage = {
        role: "assistant",
        content: "",
        source: engineReady.current ? "device" : "server",
      };
      setMessages([...updatedHistory, assistantMsg]);

      let fullResponse = "";

      const onToken = (token: string, done: boolean) => {
        fullResponse += token;
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?.role === "assistant") {
            copy[copy.length - 1] = { ...last, content: fullResponse };
          }
          return copy;
        });
        if (done) {
          setState((s) => ({ ...s, isStreaming: false }));
        }
      };

      try {
        if (engineReady.current) {
          // ── On-device path ──────────────────────────────────────────────────
          const history = updatedHistory
            .slice(-10) // last 10 turns for context
            .map(({ role, content }) => ({ role, content }));

          await askWebLLM(userMessage, onToken, history);
          setState((s) => ({ ...s, source: "device", isStreaming: false }));
        } else if (serverFallback) {
          // ── Server fallback path ─────────────────────────────────────────────
          await serverFallback(userMessage, updatedHistory, onToken);
          setState((s) => ({ ...s, source: "server", isStreaming: false }));
        } else {
          throw new Error(
            "No AI source available — WebGPU not supported and no server fallback provided",
          );
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : "AI request failed";
        setState((s) => ({ ...s, isStreaming: false, error: errMsg, source: "server" }));

        // Remove empty assistant placeholder on error
        setMessages((prev) => {
          const copy = [...prev];
          if (copy[copy.length - 1]?.content === "") copy.pop();
          return copy;
        });
      }

      return fullResponse;
    },
    [messages, serverFallback],
  );

  /** Clear conversation history */
  const clearMessages = useCallback(() => setMessages([]), []);

  return {
    ask,
    loadModel,
    clearMessages,
    state,
    messages,
  };
}

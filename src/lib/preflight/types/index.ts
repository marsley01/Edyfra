export type Timestamp = string;
export type Duration = number;
export type Bytes = number;
export type Percentage = number;
export type Version = string;
export type SemVer = `${number}.${number}.${number}`;
export type ErrorCode = string;
export type AgentId = string;
export type MemoryLayer =
  | "WORKING" | "SESSION" | "LONG_TERM" | "SEMANTIC"
  | "KNOWLEDGE_GRAPH" | "VECTOR" | "PROJECT" | "USER"
  | "SHARED" | "ENCRYPTED";
export type ModelFamily =
  | "GPT4" | "GPT4O" | "GPT4O_MINI" | "CLAUDE_3_5_SONNET"
  | "CLAUDE_3_5_HAIKU" | "CLAUDE_3_OPUS" | "GEMINI_PRO"
  | "GEMINI_FLASH" | "LLAMA" | "MISTRAL_LARGE"
  | "DEEPSEEK_CHAT" | "QWEN_PLUS" | "CUSTOM";
export type ModelCapability =
  | "REASONING" | "CODING" | "VISION" | "FUNCTION_CALLING"
  | "LONG_CONTEXT" | "FAST" | "CHEAP" | "MULTIMODAL" | "EMBEDDING";
export type LogLevel = "TRACE" | "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";

export interface ErrorDetail {
  code: ErrorCode;
  message: string;
  details?: unknown | undefined;
  stack?: string | undefined;
  cause?: ErrorDetail | undefined;
}

export type Result<T, E = ErrorDetail> =
  | { success: true; value: T }
  | { success: false; error: E };

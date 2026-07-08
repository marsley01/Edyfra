export type LogLevel = "info" | "warn" | "error";

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
  environment: string;
  route?: string;
  userId?: string;
}

const isProduction = () => process.env.NODE_ENV === "production";
const isTest = () => process.env.NODE_ENV === "test";

function writeLog(entry: LogEntry): void {
  if (isTest()) return;

  if (isProduction()) {
    console[entry.level](JSON.stringify(entry));
  } else {
    const prefix = `[${entry.level.toUpperCase()}]`;
    const suffix = entry.context ? ` ${JSON.stringify(entry.context)}` : "";
    console[entry.level](prefix, entry.message, suffix);
  }
}

export function log(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
): void {
  writeLog({
    level,
    message,
    context,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
}

export function logInfo(
  message: string,
  context?: Record<string, unknown>,
): void {
  log("info", message, context);
}

export function logWarn(
  message: string,
  context?: Record<string, unknown>,
): void {
  log("warn", message, context);
}

export function logError(
  message: string,
  context?: Record<string, unknown>,
): void {
  log("error", message, context);
}

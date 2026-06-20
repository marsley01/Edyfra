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

export function log(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
): void {
  const entry: LogEntry = {
    level,
    message,
    context,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  };

  if (process.env.NODE_ENV === "production") {
    console[level](JSON.stringify(entry));
  } else {
    console[level](`[${entry.level.toUpperCase()}]`, message, context || "");
  }
}

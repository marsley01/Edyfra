import type { LogLevel } from "@agent-preflight/types";

export type { LogLevel };

export const LOG_LEVELS: Record<LogLevel, number> = {
  TRACE: 0,
  DEBUG: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4,
  FATAL: 5,
};

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown> | undefined;
  correlationId?: string | undefined;
  error?: Error | undefined;
}

export interface LoggerTransport {
  log(entry: LogEntry): void;
}

export interface LoggerOptions {
  level?: LogLevel | undefined;
  transports?: LoggerTransport[] | undefined;
  context?: Record<string, unknown> | undefined;
  correlationId?: string | undefined;
}

const LEVEL_COLORS: Partial<Record<LogLevel, string>> = {
  TRACE: "\x1b[90m",
  DEBUG: "\x1b[36m",
  INFO: "\x1b[32m",
  WARN: "\x1b[33m",
  ERROR: "\x1b[31m",
  FATAL: "\x1b[35m",
};

const RESET_COLOR = "\x1b[0m";

class ConsoleTransport implements LoggerTransport {
  private readonly colorize: boolean;

  constructor(colorize = true) {
    this.colorize = colorize;
  }

  log(entry: LogEntry): void {
    const timestamp = entry.timestamp;
    const level = entry.level.padEnd(5);

    /* eslint-disable-next-line no-console */
    const logFn =
      entry.level === "ERROR" || entry.level === "FATAL"
        ? console.error
        : entry.level === "WARN"
          ? console.warn
          : console.log;

    if (this.colorize) {
      const color = LEVEL_COLORS[entry.level] ?? "";
      logFn(
        `${RESET_COLOR}[${timestamp}] ${color}${level}${RESET_COLOR}: ${entry.message}`,
        ...this.formatExtra(entry),
      );
    } else {
      logFn(`[${timestamp}] ${level}: ${entry.message}`, ...this.formatExtra(entry));
    }
  }

  private formatExtra(entry: LogEntry): unknown[] {
    const extras: unknown[] = [];

    if (entry.correlationId !== undefined) {
      extras.push({ correlationId: entry.correlationId });
    }

    if (entry.context !== undefined && Object.keys(entry.context).length > 0) {
      extras.push(entry.context);
    }

    if (entry.error !== undefined) {
      extras.push(entry.error);
    }

    return extras;
  }
}

class FileTransport implements LoggerTransport {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  log(entry: LogEntry): void {
    const jsonLine = JSON.stringify({
      ...entry,
      error:
        entry.error !== undefined
          ? {
              name: entry.error.name,
              message: entry.error.message,
              stack: entry.error.stack,
            }
          : undefined,
    });

    // In a real implementation, this would write to a file stream.
    // eslint-disable-next-line no-console
    console.log(`[FILE:${this.filePath}] ${jsonLine}`);
  }
}

export class Logger {
  private readonly level: LogLevel;
  private readonly transports: LoggerTransport[];
  private readonly baseContext: Record<string, unknown>;
  private readonly correlationId: string | undefined;

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? "INFO";
    this.transports = options.transports ?? [new ConsoleTransport(true)];
    this.baseContext = options.context ?? {};
    this.correlationId = options.correlationId ?? undefined;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error,
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.baseContext, ...context },
      correlationId: this.correlationId,
      error,
    };

    for (const transport of this.transports) {
      transport.log(entry);
    }
  }

  trace(message: string, context?: Record<string, unknown>): void {
    this.log("TRACE", message, context);
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log("DEBUG", message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log("INFO", message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log("WARN", message, context);
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log("ERROR", message, context, error);
  }

  fatal(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log("FATAL", message, context, error);
  }

  child(context: Record<string, unknown>): Logger {
    return new Logger({
      level: this.level,
      transports: this.transports,
      context: { ...this.baseContext, ...context },
      correlationId: this.correlationId ?? undefined,
    });
  }

  withCorrelationId(correlationId: string): Logger {
    return new Logger({
      level: this.level,
      transports: this.transports,
      context: this.baseContext,
      correlationId,
    });
  }

  static console(options: LoggerOptions = {}): Logger {
    return new Logger({
      ...options,
      transports: [new ConsoleTransport(true)],
    });
  }

  static json(options: LoggerOptions = {}): Logger {
    return new Logger({
      ...options,
      transports: [new ConsoleTransport(false)],
    });
  }

  static file(filePath: string, options: LoggerOptions = {}): Logger {
    return new Logger({
      ...options,
      transports: [new FileTransport(filePath)],
    });
  }
}

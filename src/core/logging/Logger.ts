export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
  environment: string;
  service?: string;
  userId?: string;
  requestId?: string;
  durationMs?: number;
}

export interface LoggerTransport {
  log(entry: LogEntry): void;
}

export class ConsoleTransport implements LoggerTransport {
  log(entry: LogEntry): void {
    const prefix = `[${entry.level.toUpperCase()}]`;
    const parts = [prefix, entry.message];

    if (entry.service) parts.push(`[${entry.service}]`);
    if (entry.durationMs !== undefined) parts.push(`+${entry.durationMs}ms`);
    if (entry.context && Object.keys(entry.context).length > 0) {
      parts.push(JSON.stringify(entry.context));
    }

    const output = parts.join(" ");

    switch (entry.level) {
      case "error":
        console.error(output);
        break;
      case "warn":
        console.warn(output);
        break;
      case "debug":
        console.debug(output);
        break;
      default:
        console.log(output);
    }
  }
}

export class JsonTransport implements LoggerTransport {
  log(entry: LogEntry): void {
    const method = entry.level === "error" ? "error" : entry.level === "warn" ? "warn" : "log";
    console[method](JSON.stringify(entry));
  }
}

export class Logger {
  private transports: LoggerTransport[] = [];
  private service?: string;

  constructor(service?: string) {
    this.service = service;
    const isProduction = process.env.NODE_ENV === "production";
    const isTest = process.env.NODE_ENV === "test";
    if (!isTest) {
      this.transports.push(isProduction ? new JsonTransport() : new ConsoleTransport());
    }
  }

  private createEntry(level: LogLevel, message: string, context?: Record<string, unknown>): LogEntry {
    return {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      service: this.service,
    };
  }

  private write(entry: LogEntry): void {
    for (const transport of this.transports) {
      transport.log(entry);
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.write(this.createEntry("debug", message, context));
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.write(this.createEntry("info", message, context));
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.write(this.createEntry("warn", message, context));
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.write(this.createEntry("error", message, context));
  }

  timed<T>(message: string, fn: () => Promise<T>, context?: Record<string, unknown>): Promise<T> {
    const start = performance.now();
    return fn()
      .then((result) => {
        const duration = performance.now() - start;
        this.write({ ...this.createEntry("info", message, context), durationMs: Math.round(duration) });
        return result;
      })
      .catch((err) => {
        const duration = performance.now() - start;
        this.write({
          ...this.createEntry("error", `${message} FAILED`, { ...context, error: String(err) }),
          durationMs: Math.round(duration),
        });
        throw err;
      });
  }

  child(service: string): Logger {
    const child = new Logger(service);
    child.transports = this.transports;
    return child;
  }

  addTransport(transport: LoggerTransport): void {
    this.transports.push(transport);
  }
}

export const logger = new Logger("app");

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Logger, ConsoleTransport, JsonTransport } from "@/core/logging/Logger";

describe("Logger", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "debug").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs info messages", () => {
    const logger = new Logger("test");
    logger.info("info message");
    expect(console.log).toHaveBeenCalled();
  });

  it("logs error messages", () => {
    const logger = new Logger("test");
    logger.error("error message");
    expect(console.error).toHaveBeenCalled();
  });

  it("logs warn messages", () => {
    const logger = new Logger("test");
    logger.warn("warn message");
    expect(console.warn).toHaveBeenCalled();
  });

  it("logs debug messages", () => {
    const logger = new Logger("test");
    logger.debug("debug message");
    expect(console.debug).toHaveBeenCalled();
  });

  it("creates child logger with service name", () => {
    const logger = new Logger("parent");
    const child = logger.child("child");
    expect(child).toBeInstanceOf(Logger);
  });

  it("timed logs duration", async () => {
    const logger = new Logger("test");
    const result = await logger.timed("test operation", async () => {
      await new Promise((r) => setTimeout(r, 10));
      return "done";
    });
    expect(result).toBe("done");
  });

  it("timed logs on error", async () => {
    const logger = new Logger("test");
    await expect(
      logger.timed("failing operation", async () => {
        throw new Error("Failed");
      }),
    ).rejects.toThrow("Failed");
  });

  it("ConsoleTransport writes to console", () => {
    const transport = new ConsoleTransport();
    transport.log({ level: "info", message: "test", timestamp: new Date().toISOString(), environment: "test" });
    expect(console.log).toHaveBeenCalled();
  });

  it("JsonTransport writes JSON", () => {
    const transport = new JsonTransport();
    transport.log({ level: "info", message: "test", timestamp: new Date().toISOString(), environment: "test" });
    expect(console.log).toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { log, logInfo, logWarn, logError } from "@/lib/logger";

describe("logger", () => {
  beforeEach(() => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("log calls console.info for info level", () => {
    log("info", "test message");
    expect(console.info).toHaveBeenCalled();
  });

  it("log calls console.warn for warn level", () => {
    log("warn", "warning message");
    expect(console.warn).toHaveBeenCalled();
  });

  it("log calls console.error for error level", () => {
    log("error", "error message");
    expect(console.error).toHaveBeenCalled();
  });

  it("logInfo is a shortcut for info level", () => {
    logInfo("info message");
    expect(console.info).toHaveBeenCalled();
  });

  it("logWarn is a shortcut for warn level", () => {
    logWarn("warn message");
    expect(console.warn).toHaveBeenCalled();
  });

  it("logError is a shortcut for error level", () => {
    logError("error message");
    expect(console.error).toHaveBeenCalled();
  });
});

import { describe, it, expect, vi } from "vitest";
import { JobQueue } from "@/core/jobs/JobQueue";

describe("JobQueue", () => {
  it("registers and enqueues jobs", async () => {
    const queue = new JobQueue();
    const handler = vi.fn().mockResolvedValue(undefined);

    queue.register("test-job", handler);
    const id = await queue.enqueue("test-job", { data: "test" });

    expect(id).toBeDefined();
    expect(typeof id).toBe("string");

    // Wait for async processing
    await new Promise((r) => setTimeout(r, 100));
    expect(handler).toHaveBeenCalled();
  });

  it("retries failed jobs", async () => {
    const queue = new JobQueue();
    let attempts = 0;
    const handler = vi.fn().mockImplementation(async () => {
      attempts++;
      if (attempts < 2) throw new Error("Temporary failure");
    });

    queue.register("retry-job", handler);
    await queue.enqueue("retry-job", {});

    await new Promise((r) => setTimeout(r, 2000));
    expect(attempts).toBeGreaterThanOrEqual(2);
  });

  it("returns queue stats", () => {
    const queue = new JobQueue();
    const stats = queue.getStats();
    expect(stats).toHaveProperty("critical");
    expect(stats).toHaveProperty("high");
    expect(stats).toHaveProperty("normal");
    expect(stats).toHaveProperty("low");
  });
});

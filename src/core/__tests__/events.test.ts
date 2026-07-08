import { describe, it, expect, vi } from "vitest";
import { EventBus } from "@/core/events/EventBus";

describe("EventBus", () => {
  it("emits and handles events", async () => {
    const bus = new EventBus();
    const handler = vi.fn();

    bus.on("test:event", handler);
    await bus.emit("test:event", { foo: "bar" }, "test");

    expect(handler).toHaveBeenCalledWith({ foo: "bar" });
  });

  it("supports unsubscribe", async () => {
    const bus = new EventBus();
    const handler = vi.fn();

    const unsub = bus.on("test:event", handler);
    unsub();
    await bus.emit("test:event", {});

    expect(handler).not.toHaveBeenCalled();
  });

  it("supports once", async () => {
    const bus = new EventBus();
    const handler = vi.fn();

    bus.once("test:event", handler);
    await bus.emit("test:event", {});
    await bus.emit("test:event", {});

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("removeAll clears handlers", async () => {
    const bus = new EventBus();
    const handler = vi.fn();

    bus.on("test:event", handler);
    bus.removeAll("test:event");
    await bus.emit("test:event", {});

    expect(handler).not.toHaveBeenCalled();
  });

  it("handles async handlers", async () => {
    const bus = new EventBus();
    const handler = vi.fn().mockResolvedValue(undefined);

    bus.on("test:async", handler);
    await bus.emit("test:async", {});

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does not throw on handler error", async () => {
    const bus = new EventBus();
    bus.on("test:error", () => {
      throw new Error("Handler failed");
    });

    await expect(bus.emit("test:error", {})).resolves.not.toThrow();
  });
});

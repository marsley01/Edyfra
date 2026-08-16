import { describe, it, expect } from "vitest";
import { FeatureFlagService } from "@/core/feature-flags/FeatureFlags";

describe("FeatureFlagService", () => {
  it("all features are enabled by default", () => {
    const flags = new FeatureFlagService();
    expect(flags.isEnabled("ai-tutor")).toBe(true);
    expect(flags.isEnabled("video-calls")).toBe(true);
  });

  it("can enable/disable features", () => {
    const flags = new FeatureFlagService();
    flags.disable("ai-tutor");
    expect(flags.isEnabled("ai-tutor")).toBe(false);
    flags.enable("ai-tutor");
    expect(flags.isEnabled("ai-tutor")).toBe(true);
  });

  it("overrides take precedence", () => {
    const flags = new FeatureFlagService();
    flags.override("ai-tutor", false);
    expect(flags.isEnabled("ai-tutor")).toBe(false);
    flags.clearOverrides();
    expect(flags.isEnabled("ai-tutor")).toBe(true);
  });

  it("isDisabled is inverse of isEnabled", () => {
    const flags = new FeatureFlagService();
    expect(flags.isDisabled("ai-tutor")).toBe(false);
    flags.disable("ai-tutor");
    expect(flags.isDisabled("ai-tutor")).toBe(true);
  });

  it("getFlag returns feature definition", () => {
    const flags = new FeatureFlagService();
    const flag = flags.getFlag("ai-tutor");
    expect(flag).toBeDefined();
    expect(flag!.description).toContain("AI-powered");
  });

  it("getAllFlags returns all features", () => {
    const flags = new FeatureFlagService();
    const all = flags.getAllFlags();
    expect(all.length).toBeGreaterThan(10);
  });
});

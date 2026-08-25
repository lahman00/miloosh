import { describe, it, expect } from "vitest";
import { executeSocialChannelHealthAgent } from "@/scripts/maintenance/social-channel-health";
import { getSocialStrategy } from "@/lib/social/strategy";
import { ADAPTERS } from "@/lib/social/channels/registry";
import type { Channel } from "@/lib/social/types";

/**
 * ROAD TO THE FIRST 1,000 REAL HUMANS mission (2026-08-22) Phase 3.
 * Real-config smoke tests: this checker's whole purpose is to catch a
 * channel that's enabled but silently broken (the bluesky/mastodon
 * finding this mission made real). Testing it against the actual
 * data/social/social-strategy.json + real adapter config is more
 * meaningful than a synthetic fixture would be.
 */
describe("Social channel health checker", () => {
  it("never flags a disabled channel, even if its credentials are also missing", async () => {
    const strategy = getSocialStrategy();
    const report = await executeSocialChannelHealthAgent();
    const flaggedChannels = report.issues.map((i) => i.location);
    for (const [channel, enabled] of Object.entries(strategy.enabledChannels)) {
      if (!enabled) expect(flaggedChannels).not.toContain(channel);
    }
  });

  it("never flags LinkedIn — its transport can't be resolved outside Vercel's own runtime (LINKEDIN_TRANSPORT is Sensitive-flagged)", async () => {
    const report = await executeSocialChannelHealthAgent();
    expect(report.issues.map((i) => i.location)).not.toContain("linkedin");
  });

  it("flags broken enabled channels only when their configuration is verifiable in this runtime", async () => {
    const strategy = getSocialStrategy();
    const report = await executeSocialChannelHealthAgent();
    const flaggedChannels = new Set(report.issues.map((i) => i.location));
    const isGitHubActions = process.env.GITHUB_ACTIONS === "true";

    for (const [channel, enabled] of Object.entries(strategy.enabledChannels) as [Channel, boolean][]) {
      if (!enabled || channel === "linkedin") continue;
      const isConfigured = ADAPTERS[channel].isConfigured();
      if (isGitHubActions && !isConfigured) {
        expect(flaggedChannels.has(channel)).toBe(false);
        continue;
      }
      expect(flaggedChannels.has(channel)).toBe(!isConfigured);
    }
  });
});

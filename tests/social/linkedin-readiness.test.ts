import { afterEach, describe, expect, it, vi } from "vitest";
import { linkedinPublishIssues, prepareLinkedInVariant } from "@/lib/social/linkedin-readiness";
import { SITE_URL } from "@/lib/site";
import { publishOneEntry } from "@/lib/social/publish";
import type { SocialQueueEntry } from "@/lib/social/types";

function entry(text: string, link = "https://miloosh.com/software/bloomfire"): SocialQueueEntry {
  return {
    id: "ready-1", pillar: "miloosh_research", topic: "research-bloomfire", sourceSlugs: ["bloomfire"], campaign: null,
    state: "SCHEDULED", createdAt: "2026-08-19T00:00:00.000Z", scheduledFor: "2026-08-20T17:00:00.000Z", qaNotes: [], history: [],
    channels: { linkedin: { text, link, imageUrl: null, altText: null, hashtags: [], publishResult: null } },
  };
}

describe("LinkedIn production readiness gates", () => {
  afterEach(() => vi.restoreAllMocks());
  it("adds a deterministic Miloosh editorial card to legacy entries without mutating them", () => {
    const original = entry("Bloomfire research was checked against current primary sources before publication, with the verification date shown on the page.");
    const prepared = prepareLinkedInVariant(original)!;
    expect(prepared.imageUrl).toContain(`${SITE_URL}/api/social/card?brand=20261005-wordmark&size=linkedin&kind=research`);
    expect(prepared.altText).toContain("Miloosh editorial card");
    expect(original.channels.linkedin?.imageUrl).toBeNull();
  });

  it("blocks malformed, internal, placeholder, spammy, and personal-profile-style copy before Buffer", () => {
    const unsafe = entry("TODO: unlock the power of this game-changer 🚀🚀🚀 with a guaranteed 40% commission.", "https://miloosh.com/internal/debug");
    expect(linkedinPublishIssues(unsafe, prepareLinkedInVariant(unsafe)!)).toEqual(expect.arrayContaining([
      expect.stringContaining("placeholder"),
      expect.stringContaining("AI-template"),
      expect.stringContaining("emojis"),
      expect.stringContaining("unsupported"),
      expect.stringContaining("known public Miloosh route"),
    ]));
  });

  it("never calls the LinkedIn adapter when deterministic pre-publish gates fail", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const unsafe = entry("TODO: unlock the power of this game-changer 🚀🚀🚀 with a guaranteed 40% commission.", "https://miloosh.com/internal/debug");
    const attempts = await publishOneEntry(unsafe, false);
    expect(attempts[0]?.result.status).toBe("FAILED");
    expect(attempts[0]?.result.error).toContain("quality gate blocked");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

import { describe, expect, it } from "vitest";
import { resolveOutboundSourcePage } from "@/lib/revenue/source-page";

describe("outbound source page attribution", () => {
  it("prefers a same-origin Referer over a client-supplied path", () => {
    expect(
      resolveOutboundSourcePage(
        "https://miloosh.com/compare/pipedrive-vs-hubspot?utm_source=google",
        "https://miloosh.com",
        "/software/notion",
      ),
    ).toBe("/compare/pipedrive-vs-hubspot?utm_source=google");
  });

  it("rejects a cross-origin Referer and uses a restricted local pathname fallback", () => {
    expect(resolveOutboundSourcePage("https://attacker.example/fake", "https://miloosh.com", "/software/pipedrive")).toBe(
      "/software/pipedrive",
    );
  });

  it("never accepts an external URL or protocol-relative URL as the client fallback", () => {
    expect(resolveOutboundSourcePage(null, "https://miloosh.com", "https://attacker.example/fake")).toBe("/unknown");
    expect(resolveOutboundSourcePage(null, "https://miloosh.com", "//attacker.example/fake")).toBe("/unknown");
  });

  it("falls back safely when both sources are missing or malformed", () => {
    expect(resolveOutboundSourcePage("not a url", "https://miloosh.com", null)).toBe("/unknown");
  });
});

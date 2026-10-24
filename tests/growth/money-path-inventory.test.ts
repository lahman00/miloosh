import { describe, expect, it } from "vitest";
import { buildContext, extractMoneyPathRows, toCsv } from "../../scripts/growth/money-path-inventory";

const ctx = {
  partnerUrls: new Map([["https://aff.example/abc", "acme"]]),
  partnerStatus: new Map([["acme", "ACTIVE (registry)"]]),
  hostVendor: new Map([["aff.example", "acme"]]),
};
const html = (body: string) => `<html><body><script>var x="<a href='https://evil.example'>"</script>${body}</body></html>`;

describe("extractMoneyPathRows", () => {
  it("separates affiliate-tagged links from plain vendor links and ignores Miloosh and social links", () => {
    const rows = extractMoneyPathRows(html(`<a href="https://aff.example/abc" rel="sponsored noopener">Visit Acme</a><a href="https://www.plain.example/pricing" rel="noopener">Pricing</a><a href="https://miloosh.com/x">in</a><a href="https://www.linkedin.com/company/x">li</a><a href="/relative">r</a><p>This is an affiliate link.</p>`), "/compare/a-vs-b", ctx);
    expect(rows.map((r) => [r.vendor, r.affiliateTagged])).toEqual([["acme", "yes"], ["plain.example", "no"]]);
    expect(rows[0]!.taggedBy).toBe("registry URL + rel=sponsored");
    expect(rows[0]!.programKnown).toBe("ACTIVE (registry)");
    expect(rows[1]!.programKnown).toBe("UNKNOWN");
    expect(rows.every((r) => r.disclosurePresent === "yes")).toBe(true);
  });

  it("flags a registry URL without rel=sponsored and a sponsored link that is not in the registry", () => {
    const rows = extractMoneyPathRows(html(`<a href="https://aff.example/abc" rel="noopener">x</a><a href="https://other.example/q" rel="sponsored">y</a>`), "/p", ctx);
    expect(rows.map((r) => r.taggedBy)).toEqual(["registry URL only (no rel=sponsored)", "rel=sponsored only (URL not in registry)"]);
  });

  it("never publishes an affiliate destination in the committed CSV, only in the private one", () => {
    const rows = extractMoneyPathRows(html(`<a href="https://aff.example/abc" rel="sponsored">x</a>`), "/p", ctx);
    expect(toCsv(rows, false)).not.toContain("aff.example/abc");
    expect(toCsv(rows, false)).toContain("[affiliate link redacted] aff.example");
    expect(toCsv(rows, true)).toContain("https://aff.example/abc");
  });

  it("reads the real registry without throwing", () => {
    const real = buildContext();
    expect(real.partnerUrls.size).toBeGreaterThan(20);
  });
});

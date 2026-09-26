import { describe, expect, it } from "vitest";
import { parseRegistry, appendAuthority, authorityState, deepLinkBaseline, authorityChanges, legacyOffsiteView } from "@/lib/authority/registry";
import { ingestOffsite } from "@/lib/google-war/offsite";
import seed from "@/data/growth/authority/registry.json";
import baseline from "@/data/growth/authority/gsc-links-baseline.json";

const now = "2026-09-26T23:00:00Z", entries = parseRegistry(seed);
// Temporal rule fixtures use the original capture, not a growing live history.
const e = { ...entries[0], observations: [entries[0].observations[0]] };
describe("canonical authority evidence", () => {
  it("validates captured exact baselines, not the approximate narrative", () => {
    expect(baseline.domains.reduce((sum, d) => sum + d.linkingPages, 0)).toBe(100);
    expect(baseline.otherReportedLinks).toBe(7); expect(baseline.otherDomains).toBe(5);
    expect(baseline.targets).toHaveLength(1); expect(baseline.deepLinks).toBe(0);
  });
  it("excludes the paid-dofollow rejection from earned authority", () => {
    const rejected = entries.find(r => r.id === "saascomparely-rejected")!;
    expect(authorityState(rejected, now)).toMatchObject({ status: "REJECTED", rejectionReason: "PAID_DOFOLLOW", disposition: "REJECTED_PAID_DOFOLLOW", linkPresent: null });
    expect(deepLinkBaseline([rejected], now)).toMatchObject({ homepagePlacements: 0, deepLinkPlacements: 0, unresolved: 0 });
    expect(legacyOffsiteView([rejected], now)[0].status).not.toBe("VERIFIED_LIVE");
  });
  it("a newer paid rejection supersedes an old public placement", () => {
    const rejected = entries.find(r => r.id === "saascomparely-rejected")!;
    const history = { ...e, observations: [...e.observations, ...rejected.observations] };
    expect(authorityState(history, now).status).toBe("REJECTED");
    expect(deepLinkBaseline([history], now).homepagePlacements).toBe(0);
  });
  it("cannot attach a paid rejection label to a live observation", () => {
    expect(() => parseRegistry([{ ...e, observations: [{ ...e.observations[0], rejectionReason: "PAID_DOFOLLOW" }] }])).toThrow();
  });
  it("keeps two real deep-link placements despite zero in GSC", () => {
    expect(deepLinkBaseline(entries, now)).toMatchObject({ homepagePlacements: 3, deepLinkPlacements: 2 });
  });
  it("requires exact public evidence; thread OPENED cannot become live", () => {
    expect(() => parseRegistry([{ ...e, observations: [{ ...e.observations[0], method: "REPORTED", status: "VERIFIED_LIVE" }] }])).toThrow();
  });
  it("rejects live reports without exact target verification", () => {
    expect(() => parseRegistry([{ ...e, observations: [{ ...e.observations[0], exactTargetVerified: false }] }])).toThrow();
  });
  it("supports a verified public brand mention without inventing a backlink", () => {
    const mention = parseRegistry([{ ...e, targetUrl: null, observations: [{ ...e.observations[0], linkPresent: false, rel: "UNKNOWN" }] }]);
    expect(deepLinkBaseline(mention, now)).toMatchObject({ homepagePlacements: 0, liveMentionsWithoutLinks: 1 });
  });
  it("does not guess rel for a missing link", () => {
    expect(() => parseRegistry([{ ...e, observations: [{ ...e.observations[0], linkPresent: false }] }])).toThrow();
  });
  it("deduplicates import replays", () => expect(appendAuthority(entries, entries)).toEqual(entries));
  it("rejects immutable observation conflicts", () => {
    expect(() => appendAuthority(entries, [{ ...e, observations: [{ ...e.observations[0], evidence: "changed" }] }])).toThrow();
  });
  it("rejects changed placement identities", () => expect(() => appendAuthority(entries, [{ ...e, targetUrl: "https://miloosh.com/software/jotform" }])).toThrow());
  it("rejects duplicate registry identities", () => expect(() => parseRegistry([...entries, { ...e, id: "different" }])).toThrow());
  it("does not let stale EXECUTED_LIVE or future evidence override public removal", () => {
    const row = { ...e, observations: [...e.observations, { ...e.observations[0], at: "2026-09-26T20:00:00Z", status: "REMOVED" as const, linkPresent: false, rel: "UNKNOWN" as const }, { ...e.observations[0], at: "2026-09-27T20:00:00Z" }] };
    expect(authorityState(row, now).status).toBe("REMOVED");
    expect(authorityChanges([e], "2026-09-26T19:50:00Z", [row], now).removed).toEqual([e.id]);
  });
  it("preserves audience conflict instead of blindly accepting the updated report", () => {
    expect(authorityState(entries.find(r => r.id === "reddit-crm-calls")!, "2026-09-26T21:59:00Z")).toMatchObject({ status: "UNVERIFIED", conflict: true, targetKind: "MENTION_ONLY" });
    expect(authorityState(entries.find(r => r.id === "reddit-crm-budget")!, now).status).toBe("REMOVED");
  });
  it("requires re-verification after freshness expires", () => expect(deepLinkBaseline(entries, "2026-11-01T00:00:00Z").deepLinkPlacements).toBe(0));
  it("retains compatibility without restoring unverified live claims", () => {
    const legacy = ingestOffsite(legacyOffsiteView(entries, now));
    expect(legacy.filter(r => r.status === "VERIFIED_LIVE")).toHaveLength(5);
    expect(legacy.find(r => r.id === "reddit-crm-budget")?.removed).toBe(true);
  });
  it("allows genuinely newer public recovery evidence", () => {
    const old = entries.find(r => r.id === "reddit-crm-calls")!;
    const recovered = { ...old, observations: [...old.observations, { ...e.observations[0], at: "2026-09-26T22:50:00Z", linkPresent: false, rel: "UNKNOWN" as const }] };
    expect(authorityState(recovered, now)).toMatchObject({ status: "VERIFIED_LIVE", conflict: false, linkPresent: false });
  });
});

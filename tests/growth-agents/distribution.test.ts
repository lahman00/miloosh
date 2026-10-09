import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { canTransition, checkLedgerText, draftOutreach, evaluatePublisher, outreachRecordSchema, validateOutreachLedger, type OutreachRecord, type PublisherEvidence } from "@/lib/growth-agents/distribution";
import { main as checkLedgerCli } from "../../scripts/growth/outreach-ledger-check";

const base: OutreachRecord = {
  id: "o-1",
  publisher: { name: "Example Weekly", domain: "example.com", kind: "NEWSLETTER" },
  assetUrl: "https://miloosh.com/compare/alpha-vs-beta",
  angle: "Source-backed pricing differences for small teams",
  status: "DRAFTED",
  evidence: ["https://example.com/about"],
};

const record = (overrides: Partial<OutreachRecord>): OutreachRecord => ({ ...base, ...overrides });

describe("outreach ledger: a message is never 'sent' without the owner's approval", () => {
  it("accepts a draft with no approval, and rejects any later state without one", () => {
    expect(validateOutreachLedger([base])).toEqual([]);
    for (const status of ["SENT", "REPLIED", "DECLINED", "NO_RESPONSE", "PLACED"] as const) {
      const problems = validateOutreachLedger([record({ status, sentOn: "2026-10-09", declinedOn: "2026-10-09", placement: { url: "https://example.com/post", verifiedOn: "2026-10-09", rel: "followed" } })]);
      expect(problems.map((p) => p.problem).join(" "), status).toMatch(/requires an owner approval reference/);
    }
  });

  it("requires the send date for SENT and the decline date for DECLINED", () => {
    expect(validateOutreachLedger([record({ status: "SENT", ownerApprovalRef: "email 2026-10-09" })]).map((p) => p.problem)).toContain("SENT requires the send date");
    expect(validateOutreachLedger([record({ status: "DECLINED", ownerApprovalRef: "email 2026-10-09" })]).map((p) => p.problem)).toContain("DECLINED requires the decline date");
  });

  it("counts a placement only when a live URL on the publisher's own domain was verified", () => {
    const placed = record({ status: "PLACED", ownerApprovalRef: "ok", placement: { url: "https://www.example.com/news/miloosh", verifiedOn: "2026-10-12", rel: "nofollow" } });
    expect(validateOutreachLedger([placed])).toEqual([]);
    expect(validateOutreachLedger([record({ status: "PLACED", ownerApprovalRef: "ok" })]).map((p) => p.problem).join(" ")).toMatch(/requires a verified placement URL/);
    const offDomain = record({ status: "PLACED", ownerApprovalRef: "ok", placement: { url: "https://other.example/post", verifiedOn: "2026-10-12", rel: "followed" } });
    expect(validateOutreachLedger([offDomain]).map((p) => p.problem).join(" ")).toMatch(/not on the publisher's own domain/);
    const early = record({ status: "REPLIED", ownerApprovalRef: "ok", placement: { url: "https://example.com/post", verifiedOn: "2026-10-12", rel: "followed" } });
    expect(validateOutreachLedger([early]).map((p) => p.problem).join(" ")).toMatch(/not PLACED/);
  });

  it("does not let the agent keep asking a publisher that declined", () => {
    const problems = validateOutreachLedger([
      record({ id: "a", status: "DECLINED", ownerApprovalRef: "ok", declinedOn: "2026-10-01" }),
      record({ id: "b", status: "DRAFTED" }),
    ]);
    expect(problems).toContainEqual({ id: "b", problem: expect.stringMatching(/already declined/) });
  });

  it("rejects a structurally invalid record instead of guessing", () => {
    const problems = validateOutreachLedger([record({ angle: "short", evidence: [] })]);
    expect(problems[0]!.problem).toMatch(/invalid record/);
    expect(outreachRecordSchema.safeParse({ ...base, status: "WHATEVER" }).success).toBe(false);
  });

  it("allows only the legal state changes", () => {
    expect(canTransition("DRAFTED", "OWNER_APPROVED")).toBe(true);
    expect(canTransition("DRAFTED", "SENT")).toBe(false);
    expect(canTransition("OWNER_APPROVED", "SENT")).toBe(true);
    expect(canTransition("REPLIED", "PLACED")).toBe(true);
    expect(canTransition("SENT", "PLACED")).toBe(false);
    expect(canTransition("DECLINED", "SENT")).toBe(false);
    expect(canTransition("PLACED", "DECLINED")).toBe(false);
  });
});

describe("publisher fit", () => {
  const good: PublisherEvidence = {
    name: "Example Weekly",
    domain: "example.com",
    coveredTopics: ["CRM", "Pricing"],
    assetTopics: ["crm"],
    acceptsEditorialPitches: true,
    paidPlacement: false,
    linkExchangeOrNetworkSignals: false,
    publishesSponsoredPolicy: true,
    explicitlyDeclined: false,
  };

  it("is eligible only with demonstrated topic overlap and every risk checked", () => {
    expect(evaluatePublisher(good).verdict).toBe("ELIGIBLE");
  });

  it("rejects paid placement, link-exchange signals and an explicit decline", () => {
    expect(evaluatePublisher({ ...good, paidPlacement: true }).verdict).toBe("REJECT");
    expect(evaluatePublisher({ ...good, linkExchangeOrNetworkSignals: true }).verdict).toBe("REJECT");
    expect(evaluatePublisher({ ...good, explicitlyDeclined: true }).verdict).toBe("REJECT");
  });

  it("rejects a publisher with no topic overlap or that does not take pitches", () => {
    expect(evaluatePublisher({ ...good, coveredTopics: ["Gardening"] }).verdict).toBe("REJECT");
    expect(evaluatePublisher({ ...good, acceptsEditorialPitches: false }).verdict).toBe("REJECT");
  });

  it("asks for review, listing what is unknown, rather than assuming an unchecked risk is absent", () => {
    const result = evaluatePublisher({ ...good, paidPlacement: null, acceptsEditorialPitches: null });
    expect(result.verdict).toBe("NEEDS_REVIEW");
    expect(result.unknowns.join(" ")).toMatch(/placements are paid/);
    expect(result.unknowns.join(" ")).toMatch(/accepts unsolicited pitches/);
  });
});

describe("outreach drafts", () => {
  const input = {
    publisherName: "Example Weekly",
    assetTitle: "Alpha vs Beta pricing, checked 2026-10",
    assetUrl: "https://miloosh.com/compare/alpha-vs-beta",
    facts: [{ statement: "Alpha's entry plan is billed per seat", source: "https://alpha.example/pricing" }],
    ask: "If useful, we would be glad to share the underlying data.",
    senderName: "Eyal",
  };

  it("is never sent and always needs the owner's approval", () => {
    const draft = draftOutreach(input);
    expect(draft.sent).toBe(false);
    expect(draft.requiresOwnerApproval).toBe(true);
    expect(draft.problems).toEqual([]);
    expect(draft.body).toContain("https://alpha.example/pricing");
  });

  it("flags a pitch with no sourced fact or with a fact that has no public source", () => {
    expect(draftOutreach({ ...input, facts: [] }).problems.join(" ")).toMatch(/No sourced fact/);
    expect(draftOutreach({ ...input, facts: [{ statement: "Beta is cheaper", source: "my notes" }] }).problems.join(" ")).toMatch(/no public source URL/);
  });

  it("flags a draft over the word limit instead of trimming facts silently", () => {
    const long = draftOutreach({ ...input, ask: Array.from({ length: 200 }, (_, i) => `word${i}`).join(" ") });
    expect(long.wordCount).toBeGreaterThan(150);
    expect(long.problems.join(" ")).toMatch(/quality bar is 150/);
  });
});

describe("ledger file check", () => {
  it("accepts an honest ledger and reports how many records it checked", () => {
    expect(checkLedgerText(JSON.stringify([base]))).toEqual({ ok: true, records: 1, problems: [] });
    expect(checkLedgerText("[]")).toEqual({ ok: true, records: 0, problems: [] });
  });

  it("never mistakes a broken file for an empty, clean ledger", () => {
    for (const text of ["{not json", "{}", '"text"', "null", "42"]) {
      const result = checkLedgerText(text);
      expect(result.ok, text).toBe(false);
      expect(result.problems[0]!.id).toBe("(file)");
    }
  });

  it("reports a record that is not an object without crashing", () => {
    const result = checkLedgerText(JSON.stringify([null, "x", { id: "ok-id" }]));
    expect(result.ok).toBe(false);
    expect(result.problems).toHaveLength(3);
    expect(result.problems[2]!.id).toBe("ok-id");
  });
});

describe("growth:outreach-check command", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "outreach-check-"));
  afterEach(() => vi.restoreAllMocks());
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  const write = (name: string, content: string) => {
    const file = path.join(dir, name);
    fs.writeFileSync(file, content, "utf8");
    return file;
  };

  it("exits 0 for an honest ledger, 1 for a dishonest one and 2 when it cannot read the file", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(checkLedgerCli([write("ok.json", JSON.stringify([base]))])).toBe(0);
    expect(log.mock.calls.join(" ")).toMatch(/Nothing was sent or changed/);
    expect(checkLedgerCli([write("bad.json", JSON.stringify([{ ...base, status: "SENT" }]))])).toBe(1);
    expect(log.mock.calls.join(" ")).toMatch(/requires an owner approval reference/);
    expect(checkLedgerCli([path.join(dir, "missing.json")])).toBe(2);
    expect(checkLedgerCli([])).toBe(2);
    expect(checkLedgerCli(["--force"])).toBe(2);
    expect(error).toHaveBeenCalled();
  });

  it("leaves the directory exactly as it found it", () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const file = write("keep.json", JSON.stringify([base]));
    const before = fs.readdirSync(dir).sort();
    const content = fs.readFileSync(file, "utf8");
    checkLedgerCli([file]);
    expect(fs.readdirSync(dir).sort()).toEqual(before);
    expect(fs.readFileSync(file, "utf8")).toBe(content);
  });
});

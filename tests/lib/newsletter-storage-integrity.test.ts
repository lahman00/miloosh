import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { getAllNewsletterLeads, getLeadByEmail, recordNewsletterLead, unsubscribeByToken, type NewsletterLead } from "@/lib/newsletter/leads";

// כל הרשומות והתגובות מדומות; אין גישה למאגר הנרשמים האמיתי.
const api = vi.hoisted(() => ({ head: vi.fn(), get: vi.fn(), list: vi.fn(), put: vi.fn() }));
vi.mock("@vercel/blob", () => api);
const makeLead = (email = "qa@example.invalid"): NewsletterLead => ({
  email, consentedAt: "2026-09-16T20:00:00.000Z", source: "unit-test", isTest: true,
  unsubscribeToken: `token-${email}`, unsubscribedAt: null,
});
const key = (email: string) => `newsletter-leads/${createHash("sha256").update(email).digest("hex")}.json`;
const response = (lead: NewsletterLead, pathname = key(lead.email)) => ({
  statusCode: 200, stream: new Response(JSON.stringify(lead)).body,
  blob: { pathname, etag: '"revision-1"' },
});
function pages(...records: NewsletterLead[]) {
  api.list.mockResolvedValue({ blobs: records.map(l => ({ pathname: key(l.email) })), hasMore: false });
  api.get.mockImplementation(async (pathname: string) => {
    const lead = records.find(l => key(l.email) === pathname);
    return lead ? response(lead) : null;
  });
}
beforeEach(() => {
  vi.resetAllMocks(); vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("בדיקה ללא רשת")))); vi.stubEnv("BLOB_READ_WRITE_TOKEN", "unit-test-only");
  api.head.mockResolvedValue({}); api.put.mockResolvedValue({}); pages();
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("newsletter remote storage integrity", () => {
  it("reads every listed page and deduplicates repeated object paths", async () => {
    const a = makeLead(), b = makeLead("second@example.invalid"); pages(a, b);
    api.list.mockReset().mockResolvedValueOnce({ blobs: [{ pathname: key(a.email) }], hasMore: true, cursor: "next" })
      .mockResolvedValueOnce({ blobs: [{ pathname: key(a.email) }, { pathname: key(b.email) }], hasMore: false });
    expect(await getAllNewsletterLeads()).toHaveLength(2);
    expect(api.list.mock.calls[1][0].cursor).toBe("next"); expect(api.get).toHaveBeenCalledTimes(2);
  });
  it("unsubscribes a matching record beyond the first page", async () => {
    const a = makeLead(), b = makeLead("second@example.invalid"); pages(a, b);
    api.list.mockReset().mockResolvedValueOnce({ blobs: [{ pathname: key(a.email) }], hasMore: true, cursor: "next" })
      .mockResolvedValueOnce({ blobs: [{ pathname: key(b.email) }], hasMore: false });
    expect(await unsubscribeByToken(b.unsubscribeToken)).toBe(true);
    expect(api.put.mock.calls[0][0]).toBe(key(b.email));
    expect(api.put.mock.calls[0][2]).toMatchObject({ access: "private", ifMatch: '"revision-1"' });
  });
  it("does not overwrite a lead when its read fails", async () => {
    api.get.mockRejectedValue(new Error("private failure detail"));
    await expect(recordNewsletterLead({ email: "qa@example.invalid", source: "unit-test" })).rejects.toThrow("Newsletter storage unavailable");
    expect(api.put).not.toHaveBeenCalled();
  });
  it("preserves the unsubscribe token with a conditional update", async () => {
    const lead = makeLead(); pages(lead);
    expect((await recordNewsletterLead({ email: lead.email, source: "unit-test" })).unsubscribeToken).toBe(lead.unsubscribeToken);
    expect(api.put.mock.calls[0][2]).toMatchObject({ ifMatch: '"revision-1"', access: "private" });
  });
  it("creates only when the point lookup confirms absence", async () => {
    await recordNewsletterLead({ email: "new@example.invalid", source: "unit-test" });
    expect(api.put.mock.calls[0][2]).toMatchObject({ allowOverwrite: false });
  });
  it("does not report a failed list as measured zero", async () => {
    api.list.mockRejectedValue(new Error("denied"));
    await expect(getAllNewsletterLeads()).rejects.toThrow("Newsletter storage unavailable");
  });
  it("rejects a continuation page without a cursor", async () => {
    api.list.mockResolvedValue({ blobs: [], hasMore: true });
    await expect(getAllNewsletterLeads()).rejects.toThrow("Newsletter storage unavailable");
  });
  it("rejects a repeated pagination cursor", async () => {
    api.list.mockResolvedValue({ blobs: [], hasMore: true, cursor: "same" });
    await expect(getAllNewsletterLeads()).rejects.toThrow("Newsletter storage unavailable");
    expect(api.list).toHaveBeenCalledTimes(2);
  });
  it("treats a missing listed object as incomplete rather than absence", async () => {
    pages(makeLead()); api.get.mockResolvedValue(null);
    await expect(getAllNewsletterLeads()).rejects.toThrow("Newsletter storage unavailable");
    await expect(unsubscribeByToken("missing-token")).rejects.toThrow("Newsletter storage unavailable");
  });
  it("rejects malformed stored JSON before any overwrite", async () => {
    api.get.mockImplementation(async () => ({ ...response(makeLead()), stream: new Response("invalid-json").body }));
    await expect(recordNewsletterLead({ email: "qa@example.invalid", source: "unit-test" })).rejects.toThrow("Newsletter storage unavailable");
    expect(api.put).not.toHaveBeenCalled();
  });
  it("rejects a stored email that does not match its object key", async () => {
    api.get.mockImplementation(async () => response(makeLead("other@example.invalid")));
    await expect(getLeadByEmail("qa@example.invalid")).rejects.toThrow("Newsletter storage unavailable");
  });
  it("does not overwrite without the revision needed for a safe update", async () => {
    api.get.mockImplementation(async () => ({ ...response(makeLead()), blob: { etag: "" } }));
    await expect(recordNewsletterLead({ email: "qa@example.invalid", source: "unit-test" })).rejects.toThrow("Newsletter storage unavailable");
    expect(api.put).not.toHaveBeenCalled();
  });
  it("keeps a confirmed unsubscribe idempotent without another write", async () => {
    const lead = { ...makeLead(), unsubscribedAt: "2026-09-16T21:00:00.000Z" }; pages(lead);
    expect(await unsubscribeByToken(lead.unsubscribeToken)).toBe(true); expect(api.put).not.toHaveBeenCalled();
  });
  it("does not classify a write conflict as successful unsubscribe", async () => {
    const lead = makeLead(); pages(lead); api.put.mockRejectedValue(new Error("conflict"));
    await expect(unsubscribeByToken(lead.unsubscribeToken)).rejects.toThrow("Newsletter storage unavailable");
  });
  it("only treats complete nonmatching reads as an unrecognized token", async () => {
    pages(makeLead()); expect(await unsubscribeByToken("wrong-token")).toBe(false); expect(api.put).not.toHaveBeenCalled();
  });
  it("can unsubscribe a readable match despite another unreadable record", async () => {
    const a = makeLead(), b = makeLead("second@example.invalid"); pages(a, b);
    api.get.mockImplementation(async (p: string) => { if (p === key(a.email)) throw new Error("broken unrelated record"); return response(b); });
    expect(await unsubscribeByToken(b.unsubscribeToken)).toBe(true);
  });
  it("keeps unsubscribed records out of the active list without deleting them", async () => {
    const a = makeLead(), b = { ...makeLead("second@example.invalid"), unsubscribedAt: "2026-09-16T21:00:00.000Z" }; pages(a, b);
    expect(await getAllNewsletterLeads()).toHaveLength(1); expect(await getAllNewsletterLeads(true)).toHaveLength(2);
  });
});
describe("newsletter local storage integrity", () => {
  function local(contents: string) {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    vi.spyOn(fs, "readFileSync").mockReturnValue(contents);
    vi.spyOn(fs, "mkdirSync").mockImplementation(() => undefined);
    vi.spyOn(fs, "renameSync").mockImplementation(() => undefined);
    vi.spyOn(fs, "unlinkSync").mockImplementation(() => undefined);
    return vi.spyOn(fs, "writeFileSync").mockImplementation(() => undefined);
  }
  it("does not replace a corrupted local store with a new single lead", async () => {
    const write = local("not-json");
    await expect(recordNewsletterLead({ email: "qa@example.invalid", source: "unit-test" })).rejects.toThrow("Newsletter storage unavailable");
    expect(write).not.toHaveBeenCalled();
  });
  it("retains all 5001 records including prior unsubscribes", async () => {
    const records = Array.from({ length: 5000 }, (_, n) => makeLead(`qa${n}@example.invalid`));
    records[0].unsubscribedAt = "2026-09-16T21:00:00.000Z";
    const write = local(JSON.stringify(records));
    await recordNewsletterLead({ email: "extra@example.invalid", source: "unit-test" });
    const saved = JSON.parse(String(write.mock.calls[0][1]));
    expect(saved).toHaveLength(5001); expect(saved[0]).toEqual(records[0]);
    expect(fs.renameSync).toHaveBeenCalledOnce();
    expect(write.mock.calls[0][2]).toMatchObject({ mode: 0o600, flag: "wx" });
  });
  it("treats a genuinely missing local file as an empty store", async () => {
    local(""); vi.mocked(fs.readFileSync).mockImplementation(() => { throw Object.assign(new Error("missing"), { code: "ENOENT" }); });
    expect(await getAllNewsletterLeads()).toEqual([]);
  });
  it("does not confuse local permission failure with absence", async () => {
    const write = local("");
    vi.mocked(fs.readFileSync).mockImplementation(() => { throw Object.assign(new Error("denied"), { code: "EACCES" }); });
    await expect(recordNewsletterLead({ email: "qa@example.invalid", source: "unit-test" })).rejects.toThrow("Newsletter storage unavailable");
    expect(write).not.toHaveBeenCalled();
  });
  it("rejects a structurally invalid local record instead of silently losing it", async () => {
    const write = local(JSON.stringify([{ email: "qa@example.invalid" }]));
    await expect(recordNewsletterLead({ email: "another@example.invalid", source: "unit-test" })).rejects.toThrow("Newsletter storage unavailable");
    expect(write).not.toHaveBeenCalled();
  });
});

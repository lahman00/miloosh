import fs from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addQueueEntries, readQueue, writeQueue } from "@/lib/social/queue";
import type { SocialQueueEntry } from "@/lib/social/types";

const blob = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock("@vercel/blob", () => blob);
const entry: SocialQueueEntry = {
  id: "integrity-fixture", pillar: "buyer_education", topic: "fixture-topic",
  sourceSlugs: [], campaign: null, state: "IDEA", createdAt: "2026-09-13T00:00:00Z",
  scheduledFor: null, channels: {}, qaNotes: [], history: [],
};
const response = (text: string) => ({ statusCode: 200, stream: new Response(text).body });
beforeEach(() => { vi.stubEnv("BLOB_READ_WRITE_TOKEN", "isolated-test-not-a-real-token"); vi.clearAllMocks(); });
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("social queue fails closed on unreadable history", () => {
  it("surfaces a storage error instead of reporting an empty queue", async () => {
    blob.get.mockRejectedValue(new Error("fixture transport error"));
    await expect(readQueue()).rejects.toThrow(/social queue/i);
  });
  it("does not overwrite history after a failed read", async () => {
    blob.get.mockRejectedValue(new Error("fixture transport error"));
    await expect(addQueueEntries([entry])).rejects.toThrow(/social queue/i);
    expect(blob.put).not.toHaveBeenCalled();
  });
  it("rejects a non-successful response", async () => {
    blob.get.mockResolvedValue({ statusCode: 304, stream: null });
    await expect(readQueue()).rejects.toThrow(/social queue/i);
  });
  it("rejects malformed JSON rather than resetting the queue", async () => {
    blob.get.mockResolvedValue(response("[truncated"));
    await expect(readQueue()).rejects.toThrow(/social queue/i);
  });
  it("rejects a non-array document", async () => {
    blob.get.mockResolvedValue(response('{"error":"unavailable"}'));
    await expect(readQueue()).rejects.toThrow(/social queue/i);
  });
  it("rejects duplicate identities before selecting or mutating an entry", async () => {
    blob.get.mockResolvedValue(response(JSON.stringify([entry, entry])));
    await expect(readQueue()).rejects.toThrow(/social queue/i);
  });
  it("rejects unrecognized state rather than allowing a corrupt lifecycle", async () => {
    blob.get.mockResolvedValue(response(JSON.stringify([{ ...entry, state: "UNRECOGNIZED" }])));
    await expect(readQueue()).rejects.toThrow(/social queue/i);
  });
  it("preserves a genuinely missing Blob as first-run empty storage", async () => {
    blob.get.mockResolvedValue(null);
    await expect(readQueue()).resolves.toEqual([]);
  });
  it("preserves an explicitly stored empty queue", async () => {
    blob.get.mockResolvedValue(response("[]"));
    await expect(readQueue()).resolves.toEqual([]);
  });
  it("preserves complete valid history without rewriting it", async () => {
    blob.get.mockResolvedValue(response(JSON.stringify([entry])));
    await expect(readQueue()).resolves.toEqual([entry]);
    expect(blob.put).not.toHaveBeenCalled();
  });
  it("rejects duplicate identities before any write", async () => {
    await expect(writeQueue([entry, entry])).rejects.toThrow(/social queue/i);
    expect(blob.put).not.toHaveBeenCalled();
  });
});


describe("local social queue failures stay distinct from first-run absence", () => {
  it("does not treat a permission failure as an empty file", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    vi.spyOn(fs, "readFileSync").mockImplementationOnce(() => { throw Object.assign(new Error("fixture"), { code: "EACCES" }); });
    await expect(readQueue()).rejects.toThrow(/local social queue/i);
  });
  it("does not treat corrupt local JSON as empty", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    vi.spyOn(fs, "readFileSync").mockReturnValueOnce("[broken");
    await expect(readQueue()).rejects.toThrow(/local social queue/i);
  });
  it("keeps missing local storage compatible with initial setup", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    vi.spyOn(fs, "readFileSync").mockImplementationOnce(() => { throw Object.assign(new Error("fixture"), { code: "ENOENT" }); });
    await expect(readQueue()).resolves.toEqual([]);
  });
  it("does not echo provider exception details into application errors", async () => {
    blob.get.mockRejectedValue(new Error("provider-secret-fixture"));
    await expect(readQueue()).rejects.not.toThrow(/provider-secret-fixture/);
  });
});

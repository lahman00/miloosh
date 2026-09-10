import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const blob = vi.hoisted(() => ({ list: vi.fn(), get: vi.fn() }));
vi.mock("@vercel/blob", () => blob);
import { getAllFirstPartyEvents } from "@/lib/analytics/events";
const event = (day: string) => ({ type: "page_view", visitorId: "reader-test", sessionId: "reader-test", path: "/", timestamp: day });
const response = (value: unknown) => ({ stream: new Response(JSON.stringify(value)).body });
beforeEach(() => { vi.stubEnv("BLOB_READ_WRITE_TOKEN", "test-token"); blob.list.mockReset(); blob.get.mockReset(); });
afterEach(() => vi.unstubAllEnvs());
describe("complete production analytics reads", () => {
  it("includes events after the first Blob page and sorts by event time", async () => {
    blob.list.mockResolvedValueOnce({ blobs: [{ pathname: "old" }], hasMore: true, cursor: "next-page" }).mockResolvedValueOnce({ blobs: [{ pathname: "new" }], hasMore: false });
    blob.get.mockImplementation(async (path: string) => response(event(path === "old" ? "2026-09-01T00:00:00Z" : "2026-09-10T00:00:00Z")));
    const rows = await getAllFirstPartyEvents();
    expect(rows.map(row => row.timestamp)).toEqual(["2026-09-10T00:00:00Z", "2026-09-01T00:00:00Z"]);
    expect(blob.list).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: "next-page" }));
  });
  it("recovers a transient object failure without losing the event", async () => {
    blob.list.mockResolvedValue({ blobs: [{ pathname: "retry" }], hasMore: false });
    blob.get.mockRejectedValueOnce(new Error("temporary")).mockResolvedValueOnce(response(event("2026-09-10T00:00:00Z")));
    expect(await getAllFirstPartyEvents()).toHaveLength(1);
  });
  it("reports unavailable evidence instead of returning an empty or partial dataset", async () => {
    blob.list.mockResolvedValue({ blobs: [{ pathname: "unavailable" }], hasMore: false });
    blob.get.mockRejectedValue(new Error("unavailable"));
    await expect(getAllFirstPartyEvents()).rejects.toThrow("Analytics read incomplete: 1 of 1");
    blob.list.mockRejectedValue(new Error("listing unavailable"));
    await expect(getAllFirstPartyEvents()).rejects.toThrow("listing unavailable");
  });
});

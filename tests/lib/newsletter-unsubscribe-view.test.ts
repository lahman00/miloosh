import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
const mocks = vi.hoisted(() => ({ unsubscribe: vi.fn() }));
vi.mock("@/lib/newsletter/leads", () => ({ unsubscribeByToken: mocks.unsubscribe }));
import UnsubscribePage, { metadata } from "@/app/newsletter/unsubscribe/page";
const html = async (token?: string) => renderToStaticMarkup(await UnsubscribePage({ searchParams: Promise.resolve({ token }) }));
beforeEach(() => vi.resetAllMocks());

// בדיקות תצוגה עם אחסון מדומה בלבד; אין אסימון אמיתי או פעולת הסרה חיה.
describe("newsletter unsubscribe view", () => {
  it("does not call storage or claim a used token for a missing link", async () => {
    const page = await html(); expect(mocks.unsubscribe).not.toHaveBeenCalled();
    expect(page).toContain("incomplete or unrecognized"); expect(page).not.toContain("already been used");
  });
  it("shows a saved preference only after a confirmed unsubscribe", async () => {
    mocks.unsubscribe.mockResolvedValue(true); const page = await html("synthetic-test-token");
    expect(page).toContain("You're unsubscribed".replace("'", "&#x27;"));
    expect(page).toContain("Your newsletter preference is saved as unsubscribed");
  });
  it("distinguishes unavailable storage from an invalid link", async () => {
    mocks.unsubscribe.mockRejectedValue(new Error("private error detail"));
    const page = await html("synthetic-test-token");
    expect(page).toContain("Unsubscribe temporarily unavailable");
    expect(page).not.toContain("private error detail"); expect(page).not.toContain("Link not recognized");
    expect(page).toContain("couldn&#x27;t confirm");
  });
  it("shows an unrecognized link only after a complete nonmatching lookup", async () => {
    mocks.unsubscribe.mockResolvedValue(false); const page = await html("synthetic-test-token");
    expect(page).toContain("Link not recognized"); expect(page).not.toContain("already been used");
  });
  it("keeps the token-bearing page out of search and referrers", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.referrer).toBe("no-referrer");
  });
});

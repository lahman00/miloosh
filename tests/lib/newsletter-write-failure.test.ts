import { afterEach, expect, it, vi } from "vitest";
import fs from "node:fs";
import { recordNewsletterLead } from "@/lib/newsletter/leads";
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
it("propagates local write failure instead of returning a phantom lead", async () => {
  vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
  vi.spyOn(fs, "readFileSync").mockReturnValue("[]");
  vi.spyOn(fs, "mkdirSync").mockImplementation(() => undefined);
  vi.spyOn(fs, "writeFileSync").mockImplementation(() => { throw new Error("test write error"); });
  await expect(recordNewsletterLead({ email: "qa@example.com", source: "unit-test" })).rejects.toThrow("Newsletter storage unavailable");
});

import fs from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/project-guard", () => ({ verifyProjectIdentity: vi.fn() }));
vi.mock("@/scripts/deployment/verify-deployment", async importOriginal => ({
  ...await importOriginal<typeof import("@/scripts/deployment/verify-deployment")>(),
  getLatestProductionDeployment: vi.fn(),
}));
import { getLatestProductionDeployment } from "@/scripts/deployment/verify-deployment";
import { captureOperationsDeployment } from "@/scripts/growth/capture-operations-deployment";
const originalArgv = process.argv;
const deployment = { id: "dpl_live", url: "https://fixture.vercel.app", status: "READY", environment: "production", aliases: ["miloosh.com"], sourceSha: "e23a126b9b4169226bd1c84ffdb94b48daf44f05" };
beforeEach(() => {
  process.argv = [...originalArgv, "--read-only"];
  vi.mocked(getLatestProductionDeployment).mockReset().mockReturnValue(deployment);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
  vi.spyOn(fs, "mkdirSync").mockReturnValue(undefined);
  vi.spyOn(fs, "writeFileSync").mockImplementation(() => {});
  vi.spyOn(fs, "renameSync").mockImplementation(() => {});
});
afterEach(() => { process.argv = originalArgv; vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe("read-only deployment capture", () => {
  it("requires explicit read-only opt-in before any remote request", async () => {
    process.argv = originalArgv.filter(a => a !== "--read-only");
    await expect(captureOperationsDeployment()).rejects.toThrow("read-only");
    expect(getLatestProductionDeployment).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("saves only local evidence after independent before/after identity agreement", async () => {
    const result = await captureOperationsDeployment();
    expect(result).toMatchObject({ deploymentId: deployment.id, aliasDeploymentId: deployment.id, sourceSha: deployment.sourceSha });
    expect(getLatestProductionDeployment).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenCalledWith("https://miloosh.com", expect.objectContaining({ method: "HEAD", redirect: "manual" }));
    for (const [file, , options] of vi.mocked(fs.writeFileSync).mock.calls) {
      expect(String(file)).toMatch(/^var\/growth\/operations\/deployment-/);
      expect(options).toEqual({ flag: "wx" });
    }
    expect(fs.renameSync).toHaveBeenCalledTimes(1);
  });
  it.each([{ aliases: [] }, { status: "BUILDING" }, { sourceSha: null }])("retains previous evidence on invalid live identity: %j", patch => {
    vi.mocked(getLatestProductionDeployment).mockReturnValue({ ...deployment, ...patch });
    return expect(captureOperationsDeployment()).rejects.toThrow("Invalid live identity").then(() => expect(fs.writeFileSync).not.toHaveBeenCalled());
  });
  it("retains previous evidence if another operator promotes during the check", async () => {
    vi.mocked(getLatestProductionDeployment).mockReturnValueOnce(deployment).mockReturnValueOnce({ ...deployment, id: "dpl_changed" });
    await expect(captureOperationsDeployment()).rejects.toThrow("changed during");
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });
  it("does not bless a redirect/login page as live production", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 307 }));
    await expect(captureOperationsDeployment()).rejects.toThrow();
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });
});

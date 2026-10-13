import { afterEach, describe, expect, it, vi } from "vitest";
import { evaluateMutationPolicy } from "@/lib/deployment/mutation-policy";

const active = { vercel: "1", environment: "production", deploymentId: "dpl_active" };
const control = { schemaVersion: 1, activeDeploymentId: "dpl_active" };
afterEach(() => vi.restoreAllMocks());

describe("deployment write ownership", () => {
  it.each([{}, { ...active, vercel: undefined }, { ...active, environment: "preview" }, { ...active, environment: "development" }])("never reads storage for a non-production runtime: %j", async identity => {
    const read = vi.fn();
    expect((await evaluateMutationPolicy(identity, read)).allowed).toBe(false);
    expect(read).not.toHaveBeenCalled();
  });
  it.each([undefined, "", "production", "dpl_bad/id"])("fails closed for missing/malformed deployment identity %s", async deploymentId => {
    const read = vi.fn();
    expect((await evaluateMutationPolicy({ ...active, deploymentId }, read)).allowed).toBe(false);
    expect(read).not.toHaveBeenCalled();
  });
  it.each([null, {}, { ...control, schemaVersion: 2 }, { ...control, activeDeploymentId: "" }, { ...control, activeDeploymentId: "dpl_candidate" }])("blocks absent, invalid or different ownership: %j", async record => {
    expect((await evaluateMutationPolicy(active, async () => record)).allowed).toBe(false);
  });
  it("allows only the exact active production deployment", async () => {
    expect(await evaluateMutationPolicy(active, async () => control)).toEqual({ allowed: true, reason: "active" });
    expect((await evaluateMutationPolicy({ ...active, deploymentId: "dpl_candidate" }, async () => control)).allowed).toBe(false);
  });
  it("does not cache ownership across a change or a storage failure", async () => {
    const read = vi.fn().mockResolvedValueOnce(control).mockResolvedValueOnce({ ...control, activeDeploymentId: "dpl_next" }).mockRejectedValueOnce(new Error("private provider detail"));
    expect((await evaluateMutationPolicy(active, read)).allowed).toBe(true);
    expect((await evaluateMutationPolicy(active, read)).allowed).toBe(false);
    expect(await evaluateMutationPolicy(active, read)).toEqual({ allowed: false, reason: "control-unavailable" });
  });
});

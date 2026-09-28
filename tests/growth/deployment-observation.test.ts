import { describe, expect, it } from "vitest";
import { resolveDeploymentObservation } from "@/lib/authority/deployment-observation";

const observed = {
  observedAt: "2026-09-28T04:44:00Z", source: "VERCEL_DEPLOYMENT_AND_CANONICAL_ALIAS_READ",
  canonicalUrl: "https://miloosh.com", canonicalHttpStatus: 200,
  deploymentId: "dpl_current", aliasDeploymentId: "dpl_current",
  sourceSha: "e23a126b9b4169226bd1c84ffdb94b48daf44f05", readyState: "READY", target: "production",
};
const now = "2026-09-28T05:00:00Z";
describe("operations deployment observation", () => {
  it("keeps exact observed identity and timestamp, never report generation time", () => {
    expect(resolveDeploymentObservation(observed, now)).toMatchObject({ status: "VERIFIED_AT_OBSERVATION", observation: observed });
  });
  it.each([null, {}, { status: "READY_VERIFIED_PRODUCTION", deploymentId: "dpl_old" }])("does not relabel an absent observation or historical receipt as current", raw => {
    expect(resolveDeploymentObservation(raw, now).status).toBe("UNKNOWN");
  });
  it.each([
    { aliasDeploymentId: "dpl_other" }, { canonicalHttpStatus: 307 }, { readyState: "BUILDING" },
    { target: "preview" }, { sourceSha: "unknown" }, { canonicalUrl: "https://other.invalid" },
  ])("fails closed for incomplete or mismatched live proof: %j", patch => {
    expect(resolveDeploymentObservation({ ...observed, ...patch }, now).status).toBe("UNKNOWN");
  });
  it.each(["2026-09-26T04:44:00Z", "2026-09-29T04:44:00Z"])("preserves stale/future %s evidence without blessing it", observedAt => {
    const result = resolveDeploymentObservation({ ...observed, observedAt }, now);
    expect(result.status).toBe("UNKNOWN");
    expect(result.observation?.observedAt).toBe(observedAt);
  });
});

import { describe, expect, it } from "vitest";
import { deploymentFailures, type DeploymentRecord } from "@/scripts/deployment/verify-deployment";
const sha = "a".repeat(40);
const record: DeploymentRecord = { id: "dpl_verified", url: "https://example.vercel.app", status: "READY", environment: "production", aliases: ["miloosh.com"], sourceSha: sha };
describe("release source and alias identity", () => {
  it("passes only exact READY live production identity", () => expect(deploymentFailures(record, sha)).toEqual([]));
  it.each([
    { sourceSha: "b".repeat(40) }, { sourceSha: null }, { status: "BUILDING" },
    { environment: "preview" }, { aliases: ["example.vercel.app"] }, { id: "" },
  ])("rejects %j despite a possible HTTP 200", change => expect(deploymentFailures({ ...record, ...change }, sha).length).toBeGreaterThan(0));
});

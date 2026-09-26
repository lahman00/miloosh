import { expect, it } from "vitest";
import { eventExportSchema, indexingFromProof, referralMovement } from "@/lib/authority/inputs";
import { authorityReferrals } from "@/lib/authority/referrals";
const url = "https://miloosh.com/research/saas-pricing-pressure-index-2026";
const now = "2026-09-26T20:00:00Z";
const proof = { url, source: "fixture only", deploymentId: "fixture", deployedAt: "2026-09-26T10:00:00Z", verifiedAt: "2026-09-26T11:00:00Z", httpStatus: 200, canonical: url, indexable: true, inSitemap: true, quotaRemaining: 1, quotaCheckedAt: "2026-09-26T11:00:00Z", requestHistoryComplete: true, previousRequests: [] };
it("requires complete exports and valid windows", () => {
  expect(eventExportSchema.safeParse({ coverage: "PARTIAL", fullHistory: false, events: [] }).success).toBe(false);
});
it("compares only same length nonoverlapping referral windows", () => {
  const a = authorityReferrals([], "2026-09-01T00:00:00Z", "2026-09-08T00:00:00Z");
  const b = authorityReferrals([], "2026-09-08T00:00:00Z", "2026-09-15T00:00:00Z");
  expect(referralMovement(a,b).comparable).toBe(true);
  expect(referralMovement(a,a).comparable).toBe(false);
  expect(referralMovement(null,b).status).toBe("UNKNOWN");
});
it("requires deployment, fresh quota and complete request history without submitting", () => {
  expect(indexingFromProof(url, null, now)).toBe("WAIT_DEPLOYMENT_VERIFICATION");
  expect(indexingFromProof(url, proof, now)).toBe("ELIGIBLE_FOR_ONE_CONTROLLED_REQUEST");
  expect(indexingFromProof(url, { ...proof, quotaCheckedAt: null }, now)).toBe("WAIT_QUOTA");
  expect(indexingFromProof(url, { ...proof, verifiedAt: "2026-09-24T11:00:00Z" }, now)).toBe("WAIT_DEPLOYMENT_VERIFICATION");
  expect(indexingFromProof(url, { ...proof, requestHistoryComplete: false }, now)).toBe("WAIT_REQUEST_HISTORY");
  expect(indexingFromProof(url, { ...proof, previousRequests: [url] }, now)).toBe("ALREADY_REQUESTED");
  expect(() => indexingFromProof("https://miloosh.com/", proof, now)).toThrow("mismatch");
});

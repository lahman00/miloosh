import { z } from "zod";

/** Evidence from the existing independent deployment + canonical alias guard.
 * Reading this file does not re-check Vercel. Keep observation time explicit. */
export const deploymentObservationSchema = z.object({
  observedAt: z.iso.datetime({ offset: true }),
  source: z.literal("VERCEL_DEPLOYMENT_AND_CANONICAL_ALIAS_READ"),
  canonicalUrl: z.literal("https://miloosh.com"),
  canonicalHttpStatus: z.literal(200),
  deploymentId: z.string().regex(/^dpl_[a-zA-Z0-9]+$/),
  sourceSha: z.string().regex(/^[a-f0-9]{40}$/i),
  readyState: z.literal("READY"),
  target: z.literal("production"),
  aliasDeploymentId: z.string().regex(/^dpl_[a-zA-Z0-9]+$/),
}).refine(r => r.deploymentId === r.aliasDeploymentId, "Deployment/alias mismatch");

/** Never substitute a handpicked old release receipt for current production.
 * Missing/invalid/stale evidence is UNKNOWN, not a healthy historical release.
 * A valid capture is point-in-time evidence, not a guarantee until next poll. */
export function resolveDeploymentObservation(raw: unknown, now: string) {
  const parsed = deploymentObservationSchema.safeParse(raw);
  if (!parsed.success) return { status: "UNKNOWN" as const, reason: "NO_VALID_ALIAS_OBSERVATION", observation: null };
  const age = Date.parse(now) - Date.parse(parsed.data.observedAt);
  if (!Number.isFinite(age) || age < 0 || age > 86400000) {
    return { status: "UNKNOWN" as const, reason: "STALE_OR_FUTURE_ALIAS_OBSERVATION", observation: parsed.data };
  }
  return { status: "VERIFIED_AT_OBSERVATION" as const, reason: "Independent source/alias/HTTP guard passed at observedAt; report regeneration is not a new verification", observation: parsed.data };
}

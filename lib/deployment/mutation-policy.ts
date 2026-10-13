/** One write owner. This module never creates or updates the control record. */
export const ACTIVE_DEPLOYMENT_PATH = "runtime/active-deployment.json";
export type MutationPolicy = { allowed: boolean; reason: "active" | "not-production" | "missing-identity" | "control-unavailable" | "inactive" };
type RuntimeIdentity = { vercel?: string; environment?: string; deploymentId?: string };
type ActiveDeployment = { schemaVersion: 1; activeDeploymentId: string };

function isControl(value: unknown): value is ActiveDeployment {
  if (!value || typeof value !== "object") return false;
  const control = value as Partial<ActiveDeployment>;
  return control.schemaVersion === 1 && typeof control.activeDeploymentId === "string" && /^dpl_[A-Za-z0-9]+$/.test(control.activeDeploymentId);
}

async function readActiveDeployment(): Promise<unknown> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("Control unavailable");
  const { get } = await import("@vercel/blob");
  const result = await get(ACTIVE_DEPLOYMENT_PATH, { access: "private", useCache: false, abortSignal: AbortSignal.timeout(2000) });
  if (!result || result.statusCode !== 200) throw new Error("Control unavailable");
  const body = await new Response(result.stream).text();
  if (body.length > 4096) throw new Error("Control unavailable");
  return JSON.parse(body);
}

/** No environment, host header, secret or QA query parameter can opt a candidate in. */
export async function evaluateMutationPolicy(identity: RuntimeIdentity, readControl: () => Promise<unknown>): Promise<MutationPolicy> {
  if (identity.vercel !== "1" || identity.environment !== "production") return { allowed: false, reason: "not-production" };
  if (!identity.deploymentId || !/^dpl_[A-Za-z0-9]+$/.test(identity.deploymentId)) return { allowed: false, reason: "missing-identity" };
  try {
    const control = await readControl();
    if (!isControl(control)) return { allowed: false, reason: "control-unavailable" };
    return control.activeDeploymentId === identity.deploymentId ? { allowed: true, reason: "active" } : { allowed: false, reason: "inactive" };
  } catch {
    return { allowed: false, reason: "control-unavailable" };
  }
}

export function getMutationPolicy(): Promise<MutationPolicy> {
  return evaluateMutationPolicy({ vercel: process.env.VERCEL, environment: process.env.VERCEL_ENV, deploymentId: process.env.VERCEL_DEPLOYMENT_ID }, readActiveDeployment);
}

export async function canMutate(): Promise<boolean> { return (await getMutationPolicy()).allowed; }

export class ReadOnlyDeploymentError extends Error {
  constructor() { super("This deployment is read-only; no change was saved or published."); this.name = "ReadOnlyDeploymentError"; }
}

export async function assertMutationAllowed(): Promise<void> {
  if (!(await canMutate())) throw new ReadOnlyDeploymentError();
}

export function readOnlyResponse(): Response {
  return Response.json({ ok: false, recorded: false, subscribed: false, readOnly: true, reason: "read_only_deployment", error: "This deployment is read-only; no change was saved or published." }, { status: 409, headers: { "Cache-Control": "private, no-store" } });
}

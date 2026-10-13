import { assertMutationAllowed } from "@/lib/deployment/mutation-policy";
import { del, put } from "@vercel/blob";

const localClaims = new Set<string>();

function claimPath(providerIdentity: string): string {
  return `social/linkedin-delivery-claims/${encodeURIComponent(providerIdentity)}.json`;
}

export async function claimLinkedInDelivery(providerIdentity: string): Promise<boolean> {
  await assertMutationAllowed();
  const pathname = claimPath(providerIdentity);
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    if (localClaims.has(pathname)) return false;
    localClaims.add(pathname);
    return true;
  }
  try {
    await put(pathname, JSON.stringify({ providerIdentity, claimedAt: new Date().toISOString() }), {
      access: "private",
      addRandomSuffix: false,
      contentType: "application/json",
    });
    return true;
  } catch {
    // Existing claim or unavailable claim storage: fail closed. Sending
    // without a durable claim would let a retry duplicate a LinkedIn post.
    return false;
  }
}

export async function recordLinkedInDelivery(providerIdentity: string, evidence: Record<string, unknown>): Promise<void> {
  await assertMutationAllowed();
  if (!process.env.BLOB_READ_WRITE_TOKEN) return;
  await put(claimPath(providerIdentity), JSON.stringify({ providerIdentity, recordedAt: new Date().toISOString(), ...evidence }), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

export async function releaseLinkedInDelivery(providerIdentity: string): Promise<void> {
  await assertMutationAllowed();
  const pathname = claimPath(providerIdentity);
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    localClaims.delete(pathname);
    return;
  }
  await del(pathname);
}

export function resetLocalLinkedInDeliveryClaimsForTests(): void {
  localClaims.clear();
}

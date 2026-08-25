"use server";

import { revalidatePath } from "next/cache";
import { fastTrackToSubmitted, fastTrackToApproved, setPipelineStatus } from "@/lib/revenue/affiliate-pipeline";
import { assertAffiliatePipelineOperationAllowed } from "@/lib/revenue/affiliate-operation-guard";

/**
 * Server actions behind the protected affiliate dashboard. Runtime pipeline
 * state is subordinate to current canonical affiliate truth: these guards stop
 * a stale UI or stale Blob entry from resurrecting an active, rejected, ended,
 * ineligible, or otherwise non-actionable relationship.
 */

export async function markSubmittedAction(slug: string): Promise<void> {
  assertAffiliatePipelineOperationAllowed(slug, "submit");
  await fastTrackToSubmitted(slug);
  revalidatePath("/internal/affiliate-pipeline");
}

export async function markApprovedAction(slug: string): Promise<void> {
  assertAffiliatePipelineOperationAllowed(slug, "approve");
  await setPipelineStatus(slug, "approved");
  revalidatePath("/internal/affiliate-pipeline");
}

export async function markRejectedAction(slug: string): Promise<void> {
  assertAffiliatePipelineOperationAllowed(slug, "reject");
  await setPipelineStatus(slug, "rejected");
  revalidatePath("/internal/affiliate-pipeline");
}

export async function markNeedsOwnerActionAction(slug: string, formData: FormData): Promise<void> {
  assertAffiliatePipelineOperationAllowed(slug, "owner_action");
  const reason = formData.get("reason");
  await setPipelineStatus(slug, "needs_owner_action", {
    ownerActionRequired: typeof reason === "string" && reason.trim() ? reason.trim() : "See notes.",
    note: typeof reason === "string" && reason.trim() ? reason.trim() : undefined,
  });
  revalidatePath("/internal/affiliate-pipeline");
}

export async function markApprovedWithUrlAction(slug: string, formData: FormData): Promise<void> {
  assertAffiliatePipelineOperationAllowed(slug, "approve");
  const affiliateUrl = formData.get("affiliateUrl");
  const notes = formData.get("notes");
  if (typeof affiliateUrl !== "string" || !affiliateUrl.trim()) {
    throw new Error("An affiliate URL is required to mark a program approved.");
  }
  await fastTrackToApproved(slug, {
    affiliateUrl: affiliateUrl.trim(),
    note: typeof notes === "string" && notes.trim() ? notes.trim() : undefined,
  });
  revalidatePath("/internal/affiliate-pipeline");
}

import { assertMutationAllowed } from "@/lib/deployment/mutation-policy";
import { timingSafeEqual } from "node:crypto";
import { applyQueueTransition, readQueue, writeQueue } from "@/lib/social/queue";
import type { PublishResult, SocialQueueEntry } from "@/lib/social/types";

export type MakeLinkedInResult = {
  postId: string;
  idempotencyKey: string;
  status: "published" | "failed";
  executionId?: string;
  linkedinPostId?: string;
  linkedinPostUrl?: string;
  error?: string;
};

export function isValidMakeCallbackAuthorization(header: string | null): boolean {
  const expected = process.env.MAKE_LINKEDIN_WEBHOOK_SECRET;
  if (!expected || !header?.startsWith("Bearer ")) return false;
  const received = header.slice(7);
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function validateMakeResult(value: unknown): MakeLinkedInResult | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  if (typeof item.postId !== "string" || item.idempotencyKey !== `linkedin:${item.postId}` || (item.status !== "published" && item.status !== "failed")) return null;
  if (item.status === "published" && typeof item.linkedinPostId !== "string") return null;
  for (const key of ["executionId", "linkedinPostId", "linkedinPostUrl", "error"] as const) if (item[key] !== undefined && typeof item[key] !== "string") return null;
  return item as MakeLinkedInResult;
}

export async function reconcileMakeLinkedInResult(result: MakeLinkedInResult, now = new Date()): Promise<{ entry: SocialQueueEntry; duplicate: boolean } | null> {
  await assertMutationAllowed();
  const queue = await readQueue();
  const index = queue.findIndex((entry) => entry.id === result.postId);
  if (index < 0) return null;
  const entry = queue[index]!;
  const variant = entry.channels.linkedin;
  if (!variant) return null;
  const previous = variant.providerState;
  if (previous?.status === "PUBLISHED") {
    if (previous.postId !== result.linkedinPostId) throw new Error("LinkedIn post identity conflict");
    return { entry, duplicate: true };
  }
  const at = now.toISOString();
  const published = result.status === "published";
  const publishResult: PublishResult = {
    channel: "linkedin",
    status: published ? "PUBLISHED" : "FAILED",
    text: variant.publishResult?.text ?? variant.text,
    link: variant.publishResult?.link ?? variant.link ?? "",
    postUrl: result.linkedinPostUrl ?? null,
    postId: result.linkedinPostId ?? null,
    verified: published,
    error: published ? "" : result.error || "Make reported a definite LinkedIn module failure.",
    contentHash: variant.publishResult?.contentHash ?? previous?.contentHash ?? "",
    mode: null,
    transport: "make",
    executionId: result.executionId ?? previous?.executionId ?? null,
  };
  const updatedChannels = { ...entry.channels, linkedin: { ...variant, publishResult, providerState: { status: published ? "PUBLISHED" as const : "FAILED" as const, attempts: previous?.attempts ?? 1, lastAttemptAt: previous?.lastAttemptAt ?? at, publishedAt: published ? at : null, postId: publishResult.postId, postUrl: publishResult.postUrl, contentHash: publishResult.contentHash, verified: published, error: publishResult.error, transport: "make" as const, executionId: publishResult.executionId } } };
  let updated: SocialQueueEntry = { ...entry, channels: updatedChannels };
  if (published && entry.state === "SCHEDULED") updated = applyQueueTransition(updated, "PUBLISHED", `LinkedIn publication confirmed by Make callback (${result.executionId ?? "execution unknown"}).`);
  queue[index] = updated;
  await writeQueue(queue);
  return { entry: updated, duplicate: false };
}

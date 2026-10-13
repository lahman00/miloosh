import { canMutate, readOnlyResponse } from "@/lib/deployment/mutation-policy";
import { NextResponse, type NextRequest } from "next/server";
import { getQueueEntry, setQueueState, updateQueueEntry } from "@/lib/social/queue";
import { publishOneEntry, providerStateFromResult } from "@/lib/social/publish";
import { reconcileBufferLinkedInPost } from "@/lib/social/channels/linkedin";

/**
 * GET reconciles a PENDING_CONFIRMATION Buffer post for one entry — the
 * same read-only lookup runPublishCycle's reconcilePendingBufferPosts
 * does automatically at the top of every cron cycle, exposed here so a
 * manually-triggered post's real delivery status can be confirmed
 * without waiting for the next automated window.
 */
export async function GET(request: NextRequest) {
  if (!(await canMutate())) return readOnlyResponse();
  const secret = process.env.SOCIAL_MANUAL_PUBLISH_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const entryId = new URL(request.url).searchParams.get("entryId");
  if (!entryId) return NextResponse.json({ error: "Missing entryId" }, { status: 400 });

  const entry = await getQueueEntry(entryId);
  if (!entry) return NextResponse.json({ error: `No queue entry ${entryId}` }, { status: 404 });
  const variant = entry.channels.linkedin;
  const bufferPostId = variant?.providerState?.bufferPostId;
  if (!variant || !bufferPostId) {
    return NextResponse.json({ entryId, state: entry.state, providerState: variant?.providerState ?? null, note: "No bufferPostId recorded to reconcile." });
  }

  const result = await reconcileBufferLinkedInPost(bufferPostId, variant.text, variant.link ?? "");
  const now = new Date().toISOString();
  const providerState = providerStateFromResult(variant.providerState, result, now);
  providerState.attempts = variant.providerState!.attempts;
  providerState.lastAttemptAt = variant.providerState!.lastAttemptAt;
  await updateQueueEntry(entry.id, { channels: { ...entry.channels, linkedin: { ...variant, publishResult: result, providerState } } });
  if (result.status === "PUBLISHED" && entry.state === "SCHEDULED") {
    await setQueueState(entry.id, "PUBLISHED", `LinkedIn publication confirmed by Buffer reconciliation (${bufferPostId}).`);
  }

  return NextResponse.json({ entryId, bufferPostId, status: result.status, postUrl: result.postUrl, postId: result.postId, verified: result.verified, error: result.error });
}

/**
 * Manual single-entry publish trigger (2026-08-21). runPublishCycle()
 * (the Vercel Cron path, app/api/cron/social-publish/route.ts) is built
 * for the automated content-engine cadence: it only fires LinkedIn inside
 * its one deliberate 17:00 UTC daily window (lib/social/publish.ts,
 * runPublishCycle's skipChannels logic). There was previously no way to
 * publish one specific, already-approved, manually-drafted queue entry
 * on demand — a real gap for an urgent, owner-directed post that can't
 * wait for the next automated window.
 *
 * This route deliberately bypasses ONLY that cadence/pacing heuristic —
 * every real safety mechanism stays in force: it still calls the same
 * publishOneEntry() the cron path uses (same adapters, same LinkedIn
 * readiness gate in lib/social/linkedin-readiness.ts, same durable
 * dedup claim in lib/social/linkedin-delivery-claims.ts, same
 * providerState/queue persistence as runPublishCycle). It only ever
 * touches the ONE entry named in the request body — never scans for due
 * work — and requires the entry to already be in state SCHEDULED (i.e.
 * deliberately queued for delivery, not an arbitrary draft).
 *
 * Gated by its own secret (SOCIAL_MANUAL_PUBLISH_SECRET), independent of
 * CRON_SECRET, so this route's exposure is scoped to whoever holds this
 * specific credential — same fail-closed pattern as the cron route.
 */
export async function POST(request: NextRequest) {
  if (!(await canMutate())) return readOnlyResponse();
  const secret = process.env.SOCIAL_MANUAL_PUBLISH_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { entryId?: string } | null;
  const entryId = body?.entryId;
  if (!entryId) {
    return NextResponse.json({ error: "Missing entryId" }, { status: 400 });
  }

  const entry = await getQueueEntry(entryId);
  if (!entry) {
    return NextResponse.json({ error: `No queue entry ${entryId}` }, { status: 404 });
  }
  if (entry.state !== "SCHEDULED") {
    return NextResponse.json({ error: `Entry ${entryId} is in state ${entry.state}, not SCHEDULED — refusing to publish.` }, { status: 409 });
  }

  const now = new Date();
  const attempts = await publishOneEntry(entry, false);
  if (attempts.length === 0) {
    return NextResponse.json({ error: "No channel on this entry needed an attempt (already published, or nothing eligible)." }, { status: 409 });
  }

  // Mirrors runPublishCycle's own handling (lib/social/publish.ts): a
  // concurrent/retried invocation that lost the durable claim made no
  // external request, so the entry must not be overwritten or marked
  // FAILED — it stays exactly as it was for a clean future retry.
  if (attempts.every((attempt) => attempt.result.status === "DUPLICATE_SKIPPED")) {
    return NextResponse.json({ entryId: entry.id, nextState: entry.state, attempts: attempts.map((a) => ({ channel: a.channel, status: a.result.status, error: a.result.error })), note: "All attempts were DUPLICATE_SKIPPED — entry left untouched." });
  }

  const updatedChannels = { ...entry.channels };
  for (const { channel, result } of attempts) {
    const current = updatedChannels[channel]!;
    updatedChannels[channel] = { ...current, publishResult: result, providerState: providerStateFromResult(current.providerState, result, now.toISOString()) };
  }
  await updateQueueEntry(entry.id, { channels: updatedChannels });

  const realPublish = attempts.some((a) => a.result.status === "PUBLISHED");
  const manualReady = attempts.some((a) => a.result.status === "MANUAL_ONLY");
  const pendingConfirmation = attempts.some((a) => a.result.status === "PENDING_CONFIRMATION");
  const nextState = realPublish ? "PUBLISHED" : manualReady ? "READY_FOR_MANUAL" : pendingConfirmation ? "SCHEDULED" : "FAILED";
  if (nextState !== "SCHEDULED") {
    await setQueueState(entry.id, nextState, "Manual single-entry publish trigger (app/api/social/publish-entry).");
  }

  return NextResponse.json({ entryId: entry.id, nextState, attempts: attempts.map((a) => ({ channel: a.channel, status: a.result.status, error: a.result.error, postUrl: a.result.postUrl, postId: a.result.postId, bufferPostId: a.result.bufferPostId, verified: a.result.verified })) });
}

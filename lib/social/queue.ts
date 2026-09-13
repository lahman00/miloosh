import fs from "node:fs";
import path from "node:path";
import { AGENTS_DIR } from "@/lib/agents/paths";
import { type QueueState, type SocialQueueEntry, QUEUE_STATES, isValidQueueTransition } from "@/lib/social/types";

/**
 * Content queue persistence — same storage strategy as
 * lib/revenue/affiliate-pipeline.ts (private Vercel Blob when
 * BLOB_READ_WRITE_TOKEN is set, so the deployed /internal/social
 * dashboard and the Vercel Cron publisher see the same real state; a
 * local-file fallback otherwise so tests and local dev never need
 * network access to a Blob store). Deliberately its own Blob pathname
 * (social/queue.json) — an entirely separate concern from the affiliate
 * pipeline, never sharing a store key.
 */

const BLOB_PATHNAME = "social/queue.json";
const LOCAL_FALLBACK_PATH = path.join(AGENTS_DIR, "social-queue.json");

function hasBlobToken(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/** Validate identity/lifecycle structure without dropping legacy optional fields. */
function assertQueueShape(value: unknown): asserts value is SocialQueueEntry[] {
  if (!Array.isArray(value)) throw new Error("Invalid social queue: expected an array.");
  const ids = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("Invalid social queue: entry is not an object.");
    }
    const record = item as Record<string, unknown>;
    if (typeof record.id !== "string" || !record.id.trim() || ids.has(record.id)
      || typeof record.state !== "string" || !(QUEUE_STATES as readonly string[]).includes(record.state)
      || typeof record.topic !== "string" || !Array.isArray(record.history)
      || !Array.isArray(record.sourceSlugs) || !record.sourceSlugs.every((slug) => typeof slug === "string")
      || !record.channels || typeof record.channels !== "object" || Array.isArray(record.channels)) {
      throw new Error("Invalid social queue: identity, lifecycle or record structure failed validation.");
    }
    ids.add(record.id);
  }
}

function parseQueue(text: string): SocialQueueEntry[] {
  const value: unknown = JSON.parse(text);
  assertQueueShape(value);
  return value;
}

function readLocalFallback(): SocialQueueEntry[] {
  try {
    return parseQueue(fs.readFileSync(LOCAL_FALLBACK_PATH, "utf-8"));
  } catch (error: unknown) {
    // Only an absent first-run file is empty. Corrupt JSON and permission errors
    // must stop read-modify-write callers instead of silently discarding history.
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return [];
    throw new Error("Unable to read local social queue; refusing to treat an error as an empty queue.");
  }
}

function writeLocalFallback(entries: SocialQueueEntry[]): void {
  fs.mkdirSync(AGENTS_DIR, { recursive: true });
  fs.writeFileSync(LOCAL_FALLBACK_PATH, JSON.stringify(entries, null, 2));
}

export async function readQueue(): Promise<SocialQueueEntry[]> {
  if (!hasBlobToken()) return readLocalFallback();
  try {
    const { get } = await import("@vercel/blob");
    // useCache: false — same reasoning as affiliate-pipeline.ts: a read
    // immediately following a write must never see a stale CDN copy.
    const result = await get(BLOB_PATHNAME, { access: "private", useCache: false });
    // The SDK returns null for an absent object; other response states are errors.
    if (result === null) return [];
    if (!result || result.statusCode !== 200) throw new Error("Unexpected social queue storage response.");
    const text = await new Response(result.stream).text();
    return parseQueue(text);
  } catch {
    // Do not expose provider errors that may contain URLs or credentials.
    throw new Error("Unable to read remote social queue; refusing to treat an error as an empty queue.");
  }
}

export async function writeQueue(entries: SocialQueueEntry[]): Promise<void> {
  assertQueueShape(entries);
  if (!hasBlobToken()) {
    writeLocalFallback(entries);
    return;
  }
  const { put } = await import("@vercel/blob");
  await put(BLOB_PATHNAME, JSON.stringify(entries, null, 2), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

export async function getQueueEntry(id: string): Promise<SocialQueueEntry | undefined> {
  return (await readQueue()).find((e) => e.id === id);
}

export async function addQueueEntries(newEntries: SocialQueueEntry[]): Promise<void> {
  const entries = await readQueue();
  const existingIds = new Set(entries.map((e) => e.id));
  const toAdd = newEntries.filter((e) => !existingIds.has(e.id));
  await writeQueue([...entries, ...toAdd]);
}

/** Pure — no I/O. Shared by setQueueState (one entry, one read+write) and any caller batching many transitions into a single read+write, so a QA or scheduling pass over thousands of entries doesn't do one Blob round-trip per entry (see scripts/social/qa.ts and schedule.ts). */
export function applyQueueTransition(entry: SocialQueueEntry, state: QueueState, note?: string): SocialQueueEntry {
  if (!isValidQueueTransition(entry.state, state)) {
    throw new Error(`Invalid social queue transition for ${entry.id}: ${entry.state} -> ${state}`);
  }
  const now = new Date().toISOString();
  return { ...entry, state, history: [...entry.history, { state, at: now, note: note ?? null }] };
}

export async function setQueueState(id: string, state: QueueState, note?: string): Promise<SocialQueueEntry> {
  const entries = await readQueue();
  const index = entries.findIndex((e) => e.id === id);
  if (index < 0) throw new Error(`No queue entry ${id}`);
  const updated = applyQueueTransition(entries[index]!, state, note);
  entries[index] = updated;
  await writeQueue(entries);
  return updated;
}

/** Persist a full entry update (e.g. after drafting channel variants) without a state transition. */
export async function updateQueueEntry(id: string, patch: Partial<SocialQueueEntry>): Promise<SocialQueueEntry> {
  const entries = await readQueue();
  const index = entries.findIndex((e) => e.id === id);
  if (index < 0) throw new Error(`No queue entry ${id}`);
  const updated: SocialQueueEntry = { ...entries[index]!, ...patch };
  entries[index] = updated;
  await writeQueue(entries);
  return updated;
}

export function countByQueueState(entries: SocialQueueEntry[]): Record<QueueState, number> {
  const counts = { IDEA: 0, DRAFTED: 0, QA_READY: 0, APPROVED_FOR_AUTO: 0, SCHEDULED: 0, READY_FOR_MANUAL: 0, PUBLISHED: 0, FAILED: 0, SKIPPED: 0 };
  for (const e of entries) counts[e.state] += 1;
  return counts;
}

/** Topic-repeat check for the content engine's cooldown rule — most recent use of each topic key, across all states. */
export function lastUsedAtByTopic(entries: SocialQueueEntry[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const e of entries) {
    const existing = map.get(e.topic);
    if (!existing || e.createdAt > existing) map.set(e.topic, e.createdAt);
  }
  return map;
}

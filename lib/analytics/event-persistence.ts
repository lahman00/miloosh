import { createHash } from "node:crypto";
import { put, get } from "@vercel/blob";
import { validEventId } from "@/lib/analytics/event-id";

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)]));
}

/** Only exact replay of an explicitly identified event is deduplicated.
 * Timestamps are server-assigned on each attempt; every other field, including
 * stage, visitor/session, product and placement, participates in the key.
 * Legacy records without IDs and separate real activations are NOT collapsed.
 */
export function eventFingerprint(event: object): string | undefined {
  const payload = Object.fromEntries(Object.entries(event).filter(([key]) => key !== "timestamp"));
  if (!validEventId(payload.eventId)) return undefined;
  return createHash("sha256").update(JSON.stringify(canonical(payload))).digest("hex");
}

/** Immutable object per event, reused across retries and concurrent workers.
 * An uncertain write is confirmed by reading the exact object, never by
 * assuming every exception means "already exists". No read-modify-write lock.
 */
export async function putAnalyticsEvent(pathname: string, event: object): Promise<boolean> {
  try {
    await put(pathname, JSON.stringify(event), {
      access: "private", addRandomSuffix: false, allowOverwrite: false, contentType: "application/json",
    });
    return true;
  } catch {
    const fingerprint = eventFingerprint(event);
    if (!fingerprint) return false;
    try {
      const response = await get(pathname, { access: "private", useCache: false });
      if (!response || response.statusCode !== 200) return false;
      return eventFingerprint(JSON.parse(await new Response(response.stream).text())) === fingerprint;
    } catch { return false; }
  }
}

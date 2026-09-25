const MAX_EVENT_BYTES = 8192;

/** Same-origin browser endpoints, not a cross-site tracking pixel. Missing
 * privacy-stripped Origin is allowed; this is abuse reduction, not human auth.
 */
export function isCrossOriginEvent(request: Request): boolean {
  if (request.headers.get("sec-fetch-site") === "cross-site") return true;
  const origin = request.headers.get("origin");
  return origin !== null && origin !== new URL(request.url).origin;
}

export function isNonProductionEvent(request: Request): boolean {
  return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(request.url).hostname) ||
    Boolean(process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production");
}

/** Cap bytes WHILE reading, not after allocating an arbitrary-size body. */
export async function readEventBody(request: Request): Promise<
  { ok: true; body: unknown } | { ok: false; status: number; reason: string }
> {
  if (Number(request.headers.get("content-length")) > MAX_EVENT_BYTES) return { ok: false, status: 413, reason: "payload_too_large" };
  const reader = request.body?.getReader();
  if (!reader) return { ok: false, status: 400, reason: "invalid_json" };
  try {
    const decoder = new TextDecoder("utf-8", { fatal: true });
    let bytes = 0, text = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_EVENT_BYTES) {
        void reader.cancel().catch(() => {});
        return { ok: false, status: 413, reason: "payload_too_large" };
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return { ok: true, body: JSON.parse(text) };
  } catch {
    return { ok: false, status: 400, reason: "invalid_json" };
  } finally { reader.releaseLock(); }
}

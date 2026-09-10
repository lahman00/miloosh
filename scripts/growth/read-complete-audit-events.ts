import type { FirstPartyEvent } from "@/lib/analytics/events";
import { get, list } from "@vercel/blob";

/** Audit-only reader: paginated, bounded concurrency, explicit failures. */
export async function readCompleteAuditEvents() {
  const paths: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: "first-party-analytics/", limit: 1000, cursor });
    paths.push(...page.blobs.map(blob => blob.pathname));
    cursor = page.hasMore ? page.cursor : undefined;
    console.log(JSON.stringify({ listedEvents: paths.length, hasMore: page.hasMore }));
  } while (cursor);
  const events: FirstPartyEvent[] = [];
  const failedPaths: string[] = [];
  let next = 0;
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (next < paths.length) {
      const path = paths[next++];
      let read = false;
      for (let attempt = 0; attempt < 3 && !read; attempt++) {
        try {
          const response = await get(path, { access: "private", useCache: false });
          if (!response) throw new Error("Missing blob");
          const event = JSON.parse(await new Response(response.stream).text()) as FirstPartyEvent;
          if (!event.type || !event.timestamp || !event.sessionId) throw new Error("Invalid event");
          events.push(event);
          read = true;
        } catch {
          if (attempt === 2) failedPaths.push(path);
        }
      }
    }
  }));
  events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return { events, listed: paths.length, failedPaths, complete: failedPaths.length === 0 };
}

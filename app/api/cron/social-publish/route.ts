import { NextResponse, type NextRequest } from "next/server";
import { getLinkedInTransport, verifyBufferLinkedInTarget } from "@/lib/social/channels/linkedin";
import { ensureFacebookDueForDailyWindow } from "@/lib/social/facebook-continuity";
import { runPublishCycle } from "@/lib/social/publish";

export const dynamic = "force-dynamic";

function businessHour(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Number(parts.find((part) => part.type === "hour")?.value ?? "-1");
}

/**
 * Vercel Cron target — Phase 18 scheduling. Vercel sends
 * `Authorization: Bearer ${CRON_SECRET}` on invocations it triggers.
 * Unauthenticated requests remain dry-run only.
 *
 * Live publication is additionally gated to the 13:00 hour in
 * America/New_York. The Vercel cron intentionally probes both UTC hours
 * that can correspond to 13:00 Eastern across DST; only the invocation
 * whose Eastern local hour is actually 13 is allowed to publish. This
 * prevents an overdue/shared queue entry from leaking out during an
 * earlier cron probe.
 *
 * `?dryRun=true` always forces a dry run.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const isAuthenticated = Boolean(secret) && authHeader === `Bearer ${secret}`;
  const forcedDryRun = new URL(request.url).searchParams.get("dryRun") === "true";
  const now = new Date();
  const inPublishWindow = businessHour(now, "America/New_York") === 13;

  // Temporary production-only Buffer verification mode; never reads or
  // mutates the social queue.
  if (isAuthenticated && process.env.SOCIAL_BUFFER_VERIFY_ONLY === "true") {
    try {
      const verification = await verifyBufferLinkedInTarget();
      const result = { authenticated: true, mode: "buffer-verification", transport: getLinkedInTransport(), ...verification };
      console.info("Buffer production verification", result);
      return NextResponse.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Buffer verification failed";
      console.error("Buffer production verification failed", { authenticated: true, mode: "buffer-verification", message });
      return NextResponse.json({ authenticated: true, mode: "buffer-verification", error: message }, { status: 502 });
    }
  }

  // Authenticated cron probes outside the 13:00 Eastern hour are deliberate
  // no-ops. Do not even run a live queue cycle: the publisher may contain
  // overdue entries and must not release them at an unintended hour.
  if (isAuthenticated && !forcedDryRun && !inPublishWindow) {
    const result = {
      authenticated: true,
      inPublishWindow: false,
      ranAt: now.toISOString(),
      dryRun: false,
      paused: false,
      entriesAttempted: 0,
      results: [],
      reason: "Outside the 13:00 America/New_York publication window.",
    };
    console.info("Social publish window skip", JSON.stringify(result));
    return NextResponse.json(result);
  }

  const liveRun = isAuthenticated && !forcedDryRun && inPublishWindow;
  const facebookContinuity = liveRun
    ? await ensureFacebookDueForDailyWindow(now)
    : { promotedEntryId: null, reason: forcedDryRun ? "dry-run" : isAuthenticated ? "outside-publish-window" : "not-authenticated" };

  const summary = await runPublishCycle({ dryRun: !liveRun });
  console.info("Social publish cycle", JSON.stringify({ inPublishWindow, facebookContinuity, ...summary }));
  return NextResponse.json({ authenticated: isAuthenticated, inPublishWindow, facebookContinuity, ...summary });
}

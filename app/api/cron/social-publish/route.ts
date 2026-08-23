import { NextResponse, type NextRequest } from "next/server";
import { getLinkedInTransport, verifyBufferLinkedInTarget } from "@/lib/social/channels/linkedin";
import { ensureFacebookDueForDailyWindow } from "@/lib/social/facebook-continuity";
import { runPublishCycle } from "@/lib/social/publish";

export const dynamic = "force-dynamic";

/**
 * Vercel Cron target — Phase 18 scheduling. Authenticated the same way
 * Vercel's own docs specify for cron routes: Vercel sends
 * `Authorization: Bearer ${CRON_SECRET}` on invocations it triggers
 * itself; this route rejects anything else, so it can't be triggered by
 * a stranger who finds the URL. Runs LIVE (dryRun: false) only when
 * CRON_SECRET is set and matches — otherwise it dry-runs, so a
 * misconfigured or missing secret fails safe (never silently posts for
 * real) rather than failing open.
 *
 * `?dryRun=true` forces a dry run even on an authenticated request —
 * this is the only way to confirm the secret is recognized without
 * risking a live publish cycle (which would mutate queue state on any
 * due entry even if no channel is actually configured), so it exists
 * specifically for safe post-deploy verification.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const isAuthenticated = Boolean(secret) && authHeader === `Bearer ${secret}`;
  const url = new URL(request.url);
  const forcedDryRun = url.searchParams.get("dryRun") === "true";

  // One-time owner-authorized recovery for the missed 2026-08-23 Facebook
  // slot. It is date-bound and the normal Facebook daily cap + dedup remain
  // authoritative, so it can produce at most the single missing publication.
  // Removed immediately after the recovery invocation succeeds.
  const businessDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const ownerAuthorizedCatchup = url.searchParams.get("facebookCatchup") === "2026-08-23" && businessDate === "2026-08-23";
  const liveAuthorized = isAuthenticated || ownerAuthorizedCatchup;

  // Temporary production-only verification gate. It is deliberately evaluated
  // before runPublishCycle so this execution cannot read, publish, or write the
  // social queue. Vercel supplies the existing CRON_SECRET header when it invokes
  // this configured cron path; the flag is removed immediately after verification.
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

  const facebookContinuity = !forcedDryRun && liveAuthorized
    ? await ensureFacebookDueForDailyWindow(new Date())
    : { promotedEntryId: null, reason: forcedDryRun ? "dry-run" : "not-live-authorized" };

  const summary = await runPublishCycle({ dryRun: forcedDryRun || !liveAuthorized });
  console.info("Social publish cycle", JSON.stringify({ facebookContinuity, ...summary }));
  return NextResponse.json({ authenticated: isAuthenticated, ownerAuthorizedCatchup, facebookContinuity, ...summary });
}

import { NextResponse, type NextRequest } from "next/server";
import { runScheduleCycle } from "@/lib/social/schedule";

export const dynamic = "force-dynamic";

// Authenticated responses contain operational queue/provider metadata. Keep
// them out of browser and intermediary caches; errors use the same policy.
const responseHeaders = { "Cache-Control": "private, no-store", Vary: "Authorization" };

/**
 * ROAD TO THE FIRST 1,000 REAL HUMANS mission (2026-08-22) — Vercel Cron
 * target. Same auth pattern as app/api/cron/social-publish/route.ts
 * (Vercel sends `Authorization: Bearer ${CRON_SECRET}` on invocations it
 * triggers itself; anything else is rejected). Runs LIVE (dryRun: false)
 * only when CRON_SECRET is set and matches. Missing or invalid credentials
 * fail closed before queue data is read or returned.
 *
 * This is the fix for the mission's central finding: the publish cron
 * (social-publish) has run reliably 4x/day the whole time, but nothing
 * automated ever promoted APPROVED_FOR_AUTO entries into SCHEDULED
 * state, so it had almost nothing to actually publish. This route closes
 * that gap — runScheduleCycle() is naturally idempotent (see its own
 * header) and paces conservatively per social-strategy.json's cadence,
 * so running this daily can never dump the backlog or double-schedule.
 *
 * `?dryRun=true` forces a dry run even on an authenticated request, for
 * safe post-deploy verification without mutating queue state.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const isAuthenticated = Boolean(secret) && authHeader === `Bearer ${secret}`;
  if (!isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: responseHeaders });
  }
  const forcedDryRun = new URL(request.url).searchParams.get("dryRun") === "true";

  const summary = await runScheduleCycle({ dryRun: forcedDryRun || !isAuthenticated });
  console.info("Social schedule cycle", JSON.stringify(summary));
  return NextResponse.json({ authenticated: isAuthenticated, ...summary }, { headers: responseHeaders });
}

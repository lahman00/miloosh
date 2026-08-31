import { NextResponse, type NextRequest } from "next/server";
import { isValidChannel, recordInboundSocialEvent } from "@/lib/social/attribution";

/**
 * Inbound half of social attribution (Phase 1E, 2026-08-17). Called by
 * components/SocialLandingCapture.tsx once per landing when a page loads
 * with utm_medium=social. Validates utm_source against the real Channel
 * enum before recording — a malformed/spoofed value is just dropped, not
 * stored as free text. campaign/contentId are stored as-is (they're
 * Miloosh's own values, round-tripped from lib/social/utm.ts, not
 * arbitrary visitor input) but capped in length as a defensive limit.
 * No IP, user-agent, or cookie is read or stored.
 */

type LandingBody = {
  utm_source?: unknown;
  utm_medium?: unknown;
  utm_campaign?: unknown;
  utm_content?: unknown;
  path?: unknown;
  isTest?: unknown;
};

export async function POST(request: NextRequest) {
  let body: LandingBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ recorded: false }, { status: 400 });
  }

  if (body.utm_medium !== "social" || !isValidChannel(body.utm_source) || typeof body.path !== "string") {
    return NextResponse.json({ recorded: false }, { status: 400 });
  }

  const campaign = typeof body.utm_campaign === "string" ? body.utm_campaign.slice(0, 100) : null;
  const contentId = typeof body.utm_content === "string" ? body.utm_content.slice(0, 100) : null;
  const landingPath = body.path.slice(0, 300);
  const isTest = body.isTest === true;

  await recordInboundSocialEvent({ channel: body.utm_source, campaign, contentId, landingPath, isTest });
  return NextResponse.json({ recorded: true });
}

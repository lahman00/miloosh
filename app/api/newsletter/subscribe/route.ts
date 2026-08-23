import { NextResponse, type NextRequest } from "next/server";
import { classifyRequest } from "@/lib/analytics/bot-filter";
import { recordNewsletterLead } from "@/lib/newsletter/leads";
import { recordFirstPartyEvent } from "@/lib/analytics/events";

/**
 * MILOOSH PEOPLE NOW mission (2026-08-23) — Email Acquisition Engine MVP.
 * Same bot/infra rejection as the analytics event route (a signup form is
 * just as real a target for scripted abuse as a beacon endpoint), same
 * "never trust client isTest without server-side gating on the request
 * itself" posture is unnecessary here since isTest is purely a QA-
 * exclusion label, not a security boundary.
 *
 * Real, honest limitation, not hidden: this records and stores the lead
 * (real infrastructure, works right now) but does NOT send a welcome
 * email or add the address to any outbound sending list — no email
 * provider is configured in this environment (checked: no RESEND/
 * SENDGRID/MAILCHIMP/POSTMARK/SES env var present). The moment one is
 * configured, this same stored lead list is what a real send would read
 * from — no lead captured now is lost waiting for that.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;

type SubscribeBody = {
  email?: unknown;
  source?: unknown;
  landingPath?: unknown;
  utmSource?: unknown;
  utmMedium?: unknown;
  utmCampaign?: unknown;
  utmContent?: unknown;
  visitorId?: unknown;
  sessionId?: unknown;
  isTest?: unknown;
  consent?: unknown;
};

export async function POST(request: NextRequest) {
  const classification = classifyRequest(request.headers);
  if (classification.kind !== "PASS") {
    return NextResponse.json({ subscribed: false, reason: "rejected" }, { status: 200 });
  }

  let body: SubscribeBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ subscribed: false, reason: "invalid_json" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  // Explicit, un-pre-checked consent is required server-side too, not just
  // in the form's own disabled-until-checked UI -- a client could bypass
  // the UI, so the real gate has to live here.
  const consent = body.consent === true;

  if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ subscribed: false, reason: "invalid_email" }, { status: 400 });
  }
  if (!consent) {
    return NextResponse.json({ subscribed: false, reason: "consent_required" }, { status: 400 });
  }
  if (typeof body.source !== "string" || body.source.length === 0) {
    return NextResponse.json({ subscribed: false, reason: "missing_source" }, { status: 400 });
  }

  const isTest = body.isTest === true;
  const visitorId = typeof body.visitorId === "string" ? body.visitorId : undefined;
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "s_anon";

  await recordNewsletterLead({
    email,
    source: body.source,
    landingPath: typeof body.landingPath === "string" ? body.landingPath : undefined,
    utmSource: typeof body.utmSource === "string" ? body.utmSource : undefined,
    utmMedium: typeof body.utmMedium === "string" ? body.utmMedium : undefined,
    utmCampaign: typeof body.utmCampaign === "string" ? body.utmCampaign : undefined,
    utmContent: typeof body.utmContent === "string" ? body.utmContent : undefined,
    visitorId,
    isTest,
  });

  // Behavioral marker only -- no email address in the anonymous analytics stream.
  await recordFirstPartyEvent({
    type: "newsletter_signup",
    source: body.source,
    path: typeof body.landingPath === "string" ? body.landingPath : "/",
    visitorId: visitorId ?? "v_anon",
    sessionId,
    timestamp: new Date().toISOString(),
    isTest,
  });

  return NextResponse.json({ subscribed: true }, { status: 201 });
}

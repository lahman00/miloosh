import { canMutate, readOnlyResponse } from "@/lib/deployment/mutation-policy";
import { NextResponse, type NextRequest } from "next/server";
import { getSoftware } from "@/data/software";
import { recordRecommendationEvent } from "@/lib/recommend/events";

/**
 * Sprint 10 Phase 7 — records a click from the results page through to a
 * recommended product's /software/[slug] page. Distinct from
 * app/api/outbound-click/route.ts (Sprint 9), which is for clicks to an
 * external vendor site — this is an internal navigation click, tracked
 * for recommendation-quality analytics, not revenue.
 */

type RecommendationClickBody = {
  slug?: unknown;
  rank?: unknown;
  matchPercent?: unknown;
  answersSummary?: unknown;
};

export async function POST(request: NextRequest) {
  if (!(await canMutate())) return readOnlyResponse();
  let body: RecommendationClickBody;

  try {
    body = (await request.json()) as RecommendationClickBody;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const { slug, rank, matchPercent, answersSummary } = body;

  if (typeof slug !== "string" || typeof answersSummary !== "string") {
    return NextResponse.json({ error: "slug and answersSummary are required strings" }, { status: 400 });
  }

  if (!getSoftware(slug)) {
    return NextResponse.json({ error: "unknown software slug" }, { status: 404 });
  }

  await recordRecommendationEvent({
    type: "recommendation_result_click",
    softwareSlug: slug,
    rank: typeof rank === "number" ? rank : undefined,
    matchPercent: typeof matchPercent === "number" ? matchPercent : undefined,
    answersSummary,
  });

  return NextResponse.json({ ok: true }, { status: 202 });
}

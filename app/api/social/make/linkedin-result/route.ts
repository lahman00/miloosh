import { canMutate, readOnlyResponse } from "@/lib/deployment/mutation-policy";
import { NextResponse, type NextRequest } from "next/server";
import { isValidMakeCallbackAuthorization, reconcileMakeLinkedInResult, validateMakeResult } from "@/lib/social/linkedin-reconciliation";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!(await canMutate())) return readOnlyResponse();
  if (!isValidMakeCallbackAuthorization(request.headers.get("authorization"))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid JSON" }, { status: 400 }); }
  const result = validateMakeResult(body);
  if (!result) return NextResponse.json({ error: "invalid result payload" }, { status: 400 });
  try {
    const reconciled = await reconcileMakeLinkedInResult(result);
    if (!reconciled) return NextResponse.json({ error: "unknown LinkedIn queue item" }, { status: 404 });
    return NextResponse.json({ ok: true, duplicate: reconciled.duplicate, postId: result.postId, status: result.status });
  } catch (error) {
    if (error instanceof Error && error.message === "LinkedIn post identity conflict") return NextResponse.json({ error: error.message }, { status: 409 });
    return NextResponse.json({ error: "reconciliation failed" }, { status: 500 });
  }
}

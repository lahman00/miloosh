import { NextResponse, type NextRequest } from "next/server";
import { getRoomProducts, SLUG_PATTERN } from "@/lib/decision-room/products";

/** Read-only details for at most 12 products already in the visitor's browser. Unknown slugs are ignored. Nothing is written or logged. */
export function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("slugs") ?? "";
  if (raw.length > 12 * 81) return NextResponse.json({ error: "too_long" }, { status: 400 });
  const slugs = raw.split(",").map((s) => s.trim()).filter((s) => SLUG_PATTERN.test(s));
  return NextResponse.json({ products: getRoomProducts(slugs) }, { headers: { "Cache-Control": "public, max-age=300, s-maxage=300" } });
}

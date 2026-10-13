import { canMutate } from "@/lib/deployment/mutation-policy";

export const dynamic = "force-dynamic";

/** Read-only capability check. Never exposes deployment IDs, control data or secrets. */
export async function GET() {
  return Response.json({ analyticsEnabled: await canMutate() }, { headers: { "Cache-Control": "private, no-store" } });
}

import type { Metadata } from "next";
import { DecisionRoom } from "./_components/DecisionRoom";
import { buildRoomIndex } from "@/lib/decision-room/products";

/**
 * Decision Room (2026-10-30). An isolated route: it is NOT in the sitemap, carries `noindex` while it is a preview, and is linked from no
 * existing page, so no canonical, robots, sitemap, structured-data or protected-page behavior changes. Entry points on other pages need a
 * separate, approved release.
 */
export const metadata: Metadata = {
  title: "Decision Room",
  description: "Save software, compare what matters to you, estimate the first-year cost and create a sourced buyer decision brief. No account needed.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/decision-room" },
};

export default function DecisionRoomPage() {
  return (
    <main id="main" className="flex-1">
      <DecisionRoom index={buildRoomIndex()} />
    </main>
  );
}

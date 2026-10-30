import type { Metadata } from "next";
import { SwitchingLab } from "./_components/SwitchingLab";
import { buildRoomIndex } from "@/lib/decision-room/products";

/**
 * Switching Lab (2026-10-30): stage 2 of the Decision Room. Same isolation as the room: NOT in the sitemap, `noindex`, linked only from
 * the Decision Room itself, so no canonical, robots, sitemap, structured-data or protected-page behavior changes elsewhere.
 */
export const metadata: Metadata = {
  title: "Switching Lab",
  description: "Plan a hands-on software trial, record what worked and what is blocked, check migration risks and download your own trial appendix. No account needed.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/decision-room/switching-lab" },
};

export default function SwitchingLabPage() {
  // Only what the lab shows: the slug to validate against the real index, the name and the category.
  const index = buildRoomIndex().map(({ slug, name, categoryName }) => ({ slug, name, categoryName }));
  return (
    <main id="main" className="flex-1">
      <SwitchingLab index={index} />
    </main>
  );
}

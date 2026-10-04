import { ImageResponse } from "next/og";
import { getComparisonBySlug } from "@/lib/comparison";
import { getPublishedComparisonSlugs } from "@/data/comparisons";
import { BRAND_COLORS } from "@/lib/brand";
import { loadBrandFonts } from "@/lib/social/fonts";

export const alt = "Software comparison";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return getPublishedComparisonSlugs().map((comparison) => ({ comparison }));
}

export default async function Image({ params }: { params: Promise<{ comparison: string }> }) {
  const { comparison } = await params;
  const data = getComparisonBySlug(comparison);
  const nameA = data?.softwareA.name ?? "Option A";
  const nameB = data?.softwareB.name ?? "Option B";
  const catA = data?.softwareA.category ?? "";
  const catB = data?.softwareB.category ?? "";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 56, background: BRAND_COLORS.canvas, color: BRAND_COLORS.ink }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 800, letterSpacing: -1.5 }}>
            miloosh<span style={{ color: BRAND_COLORS.citrine }}>.</span>
          </div>
          <div style={{ display: "flex", fontSize: 18, fontWeight: 700, background: BRAND_COLORS.citrine, borderRadius: 999, padding: "8px 18px" }}>COMPARISON</div>
        </div>

        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", gap: 28 }}>
          <div style={{ display: "flex", flex: 1, minHeight: 230, borderRadius: 24, background: BRAND_COLORS.stage, padding: 32, flexDirection: "column", justifyContent: "center", alignItems: "flex-end", textAlign: "right", gap: 10 }}>
            <div style={{ display: "flex", fontSize: 52, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>{nameA}</div>
            {catA ? <div style={{ display: "flex", fontSize: 21, color: BRAND_COLORS.muted }}>{catA}</div> : null}
          </div>
          <div style={{ display: "flex", width: 78, height: 78, borderRadius: 999, background: BRAND_COLORS.citrine, alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <div style={{ display: "flex", fontSize: 23, fontWeight: 800 }}>VS</div>
          </div>
          <div style={{ display: "flex", flex: 1, minHeight: 230, borderRadius: 24, background: BRAND_COLORS.surfaceSoft, padding: 32, flexDirection: "column", justifyContent: "center", alignItems: "flex-start", textAlign: "left", gap: 10 }}>
            <div style={{ display: "flex", fontSize: 52, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>{nameB}</div>
            {catB ? <div style={{ display: "flex", fontSize: 21, color: BRAND_COLORS.muted }}>{catB}</div> : null}
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 21, color: BRAND_COLORS.muted, justifyContent: "center" }}>Software research you can verify.</div>
      </div>
    ),
    { ...size, fonts: await loadBrandFonts() },
  );
}

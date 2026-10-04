import { ImageResponse } from "next/og";
import { BRAND_COLORS } from "@/lib/brand";
import { loadBrandFonts } from "@/lib/social/fonts";

export async function GET() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: BRAND_COLORS.ink, position: "relative" }}>
        <span style={{ fontSize: 470, fontWeight: 800, color: BRAND_COLORS.canvas, letterSpacing: -18 }}>M</span>
        <span style={{ position: "absolute", right: 118, bottom: 118, width: 92, height: 92, borderRadius: 999, background: BRAND_COLORS.citrine }} />
      </div>
    ),
    { width: 800, height: 800, fonts: await loadBrandFonts() },
  );
}

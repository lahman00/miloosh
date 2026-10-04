import { ImageResponse } from "next/og";
import { BRAND_COLORS } from "@/lib/brand";
import { loadBrandFonts } from "@/lib/social/fonts";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BRAND_COLORS.ink,
          borderRadius: 40,
          position: "relative",
        }}
      >
        <span style={{ fontSize: 108, fontWeight: 800, color: BRAND_COLORS.canvas, letterSpacing: -4 }}>M</span>
        <span style={{ position: "absolute", right: 30, bottom: 30, width: 22, height: 22, borderRadius: 999, background: BRAND_COLORS.citrine }} />
      </div>
    ),
    { ...size, fonts: await loadBrandFonts() },
  );
}

import { ImageResponse } from "next/og";
import { BRAND_COLORS } from "@/lib/brand";
import { loadBrandFonts } from "@/lib/social/fonts";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
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
          borderRadius: 7,
          position: "relative",
        }}
      >
        <span style={{ fontSize: 20, fontWeight: 800, color: BRAND_COLORS.canvas, letterSpacing: -1 }}>M</span>
        <span style={{ position: "absolute", right: 5, bottom: 5, width: 4, height: 4, borderRadius: 999, background: BRAND_COLORS.citrine }} />
      </div>
    ),
    { ...size, fonts: await loadBrandFonts() },
  );
}

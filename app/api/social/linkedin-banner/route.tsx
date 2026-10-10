import { ImageResponse } from "next/og";
import { BRAND_COLORS, BRAND_FONT_FAMILY } from "@/lib/brand";
import { loadBrandFonts } from "@/lib/social/fonts";

/**
 * LinkedIn company-page cover art, matching the approved warm Miloosh brand.
 * Keep the headline clear of the profile-photo overlay and the mobile crop.
 * This is a media route, not an automatic LinkedIn cover upload.
 */
const WIDTH = 4200;
const HEIGHT = 700;

export async function GET() {
  return new ImageResponse(
    <div style={{
      width: "100%", height: "100%", display: "flex",
      flexDirection: "column", alignItems: "center", justifyContent: "center",
      background: BRAND_COLORS.canvas, fontFamily: BRAND_FONT_FAMILY,
      gap: 52,
    }}>
      <div style={{
        display: "flex", color: BRAND_COLORS.ink, fontSize: 147,
        fontWeight: 800, letterSpacing: -5, lineHeight: 1.06,
      }}>Software research you can verify.</div>
      <div style={{
        display: "flex", width: 280, height: 21,
        borderRadius: 999, background: BRAND_COLORS.citrine,
      }} />
    </div>,
    { width: WIDTH, height: HEIGHT, fonts: await loadBrandFonts() },
  );
}

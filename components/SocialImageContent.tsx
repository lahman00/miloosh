import { BRAND_COLORS } from "@/lib/brand";
import { SITE_TAGLINE } from "@/lib/site";
import { wordmarkWidthForHeight } from "@/lib/social/logo";

export function SocialImageContent({ logoDataUri }: { logoDataUri: string }) {
  const logoHeight = 52;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: BRAND_COLORS.canvas,
        color: BRAND_COLORS.ink,
        padding: 72,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders img in ImageResponse. */}
      <img src={logoDataUri} width={wordmarkWidthForHeight(logoHeight)} height={logoHeight} alt="" />

      <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 900 }}>
        <div style={{ display: "flex", fontSize: 72, fontWeight: 600, lineHeight: 1.05, letterSpacing: -3 }}>
          The thoughtful shortlist for software decisions.
        </div>
        <div style={{ display: "flex", fontSize: 30, color: BRAND_COLORS.muted, lineHeight: 1.4 }}>
          {SITE_TAGLINE}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ display: "flex", width: 124, height: 12, borderRadius: 999, background: BRAND_COLORS.citrine }} />
        <div style={{ display: "flex", width: 66, height: 12, borderRadius: 999, background: BRAND_COLORS.stage }} />
      </div>
    </div>
  );
}

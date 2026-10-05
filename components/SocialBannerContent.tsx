import { BRAND_COLORS } from "@/lib/brand";
import { SITE_TAGLINE } from "@/lib/site";
import { logoWidthForHeight } from "@/lib/social/logo";

type BannerScale = "linkedin" | "facebook" | "x" | "youtube";

const TYPE: Record<BannerScale, { logoHeight: number; tagline: number; detail: number; gap: number; maxWidth: string; sideWidth: string; barWidth: string }> = {
  linkedin: { logoHeight: 116, tagline: 58, detail: 34, gap: 24, maxWidth: "68%", sideWidth: "18%", barWidth: "10%" },
  facebook: { logoHeight: 72, tagline: 38, detail: 24, gap: 18, maxWidth: "64%", sideWidth: "17%", barWidth: "10%" },
  x: { logoHeight: 66, tagline: 34, detail: 22, gap: 16, maxWidth: "66%", sideWidth: "16%", barWidth: "9%" },
  youtube: { logoHeight: 136, tagline: 66, detail: 42, gap: 30, maxWidth: "58%", sideWidth: "20%", barWidth: "12%" },
};

export function SocialBannerContent({ logoDataUri, scale = "facebook" }: { logoDataUri: string; scale?: BannerScale }) {
  const t = TYPE[scale];
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: BRAND_COLORS.canvas,
        color: BRAND_COLORS.ink,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div style={{ position: "absolute", left: 0, top: 0, width: t.sideWidth, height: "100%", background: BRAND_COLORS.stage }} />
      <div style={{ position: "absolute", right: "5%", top: "17%", width: t.barWidth, height: "66%", borderRadius: 36, background: BRAND_COLORS.citrine }} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          gap: t.gap,
          zIndex: 2,
          maxWidth: t.maxWidth,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders img in ImageResponse. */}
        <img src={logoDataUri} width={logoWidthForHeight(t.logoHeight)} height={t.logoHeight} alt="" />
        <div style={{ display: "flex", fontSize: t.tagline, fontWeight: 600, lineHeight: 1.15 }}>
          {SITE_TAGLINE}
        </div>
        <div style={{ display: "flex", fontSize: t.detail, color: BRAND_COLORS.muted, lineHeight: 1.35 }}>
          Comparisons, pricing and decision guides — sourced and dated.
        </div>
      </div>
    </div>
  );
}

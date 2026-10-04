import { BRAND_COLORS } from "@/lib/brand";
import { SITE_TAGLINE } from "@/lib/site";

export function SocialImageContent() {
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
      <div style={{ display: "flex", fontSize: 42, fontWeight: 800, letterSpacing: -2 }}>
        miloosh<span style={{ color: BRAND_COLORS.citrine }}>.</span>
      </div>

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

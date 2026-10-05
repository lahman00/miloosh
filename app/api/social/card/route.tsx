import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { SITE_NAME } from "@/lib/site";
import { BRAND_COLORS } from "@/lib/brand";
import { loadBrandFonts } from "@/lib/social/fonts";
import { loadCanonicalLogoDataUri, logoWidthForHeight } from "@/lib/social/logo";

// Public social artwork follows the same redesigned visual system as the site:
// warm canvas, forest ink, sage panels, citrine emphasis and Manrope. The
// content engine still supplies every factual headline/price/count; this route
// only composes that real data into channel-specific artwork.

const SIZES: Record<string, { width: number; height: number }> = {
  square: { width: 1080, height: 1080 },
  linkedin: { width: 1200, height: 627 },
  facebook: { width: 1200, height: 630 },
  x: { width: 1200, height: 675 },
};

const KIND_LABELS: Record<string, string> = {
  pricing: "PRICING UPDATE",
  comparison: "COMPARISON",
  alternatives: "ALTERNATIVES",
  research: "VERIFIED RESEARCH",
  category: "CATEGORY INSIGHT",
  switching: "SWITCHING GUIDE",
};

const ACCENT = BRAND_COLORS.citrine;

function Header({ badge, logoDataUri }: { badge: string; logoDataUri: string }) {
  const logoHeight = 36;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori (next/og) renders <img>, not next/image */}
        <img src={logoDataUri} width={logoWidthForHeight(logoHeight)} height={logoHeight} alt="" />
        <div style={{ display: "flex", fontSize: 34, fontWeight: 800, color: BRAND_COLORS.logoInk, letterSpacing: -1.5 }}>miloosh<span style={{ color: BRAND_COLORS.logoPeriod }}>.</span></div>
      </div>
      {badge ? (
        <div
          style={{
            display: "flex",
            fontSize: 22,
            fontWeight: 600,
            color: BRAND_COLORS.ink,
            background: BRAND_COLORS.citrine,
            borderRadius: 999,
            padding: "8px 20px",
          }}
        >
          {badge}
        </div>
      ) : null}
    </div>
  );
}

function Footer() {
  return <div style={{ display: "flex", fontSize: 22, color: BRAND_COLORS.muted }}>Software research you can verify.</div>;
}

function StackedBody({ headline, sub, sizeKey }: { headline: string; sub: string; sizeKey: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", fontSize: sizeKey === "square" ? 56 : 48, fontWeight: 800, color: BRAND_COLORS.ink, lineHeight: 1.15, letterSpacing: -1.5 }}>{headline}</div>
      {sub ? <div style={{ display: "flex", fontSize: 28, color: BRAND_COLORS.muted, lineHeight: 1.4 }}>{sub}</div> : null}
    </div>
  );
}

// "{A} vs {B}: ..." -> split-panel with a VS badge, mirroring app/compare/[comparison]/opengraph-image.tsx.
function ComparisonBody({ headline, sub, sizeKey }: { headline: string; sub: string; sizeKey: string }) {
  const match = headline.match(/^(.+?)\s+vs\.?\s+(.+?):/i);
  if (!match) return <StackedBody headline={headline} sub={sub} sizeKey={sizeKey} />;
  const [, nameA, nameB] = match;
  const nameSize = sizeKey === "square" ? 52 : 44;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 28 }}>
        <div style={{ display: "flex", flex: 1, fontSize: nameSize, fontWeight: 800, color: BRAND_COLORS.ink, lineHeight: 1.1, letterSpacing: -1, justifyContent: "flex-end", textAlign: "right" }}>{nameA}</div>
        <div
          style={{
            display: "flex",
            width: 64,
            height: 64,
            borderRadius: 999,
            background: BRAND_COLORS.citrine,
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", fontSize: 20, fontWeight: 800, color: BRAND_COLORS.ink }}>VS</div>
        </div>
        <div style={{ display: "flex", flex: 1, fontSize: nameSize, fontWeight: 800, color: BRAND_COLORS.ink, lineHeight: 1.1, letterSpacing: -1 }}>{nameB}</div>
      </div>
      {sub ? <div style={{ display: "flex", fontSize: 26, color: BRAND_COLORS.muted, lineHeight: 1.4, textAlign: "center", justifyContent: "center" }}>{sub}</div> : null}
    </div>
  );
}

// "Moving from {A} to {B}? ..." -> A -> B arrow layout, distinct from a straight VS comparison.
function SwitchingBody({ headline, sub, sizeKey }: { headline: string; sub: string; sizeKey: string }) {
  const match = headline.match(/from\s+(.+?)\s+to\s+([^?.,]+)/i);
  if (!match) return <StackedBody headline={headline} sub={sub} sizeKey={sizeKey} />;
  const [, nameA, nameB] = match;
  const nameSize = sizeKey === "square" ? 46 : 40;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <div
          style={{
            display: "flex",
            fontSize: nameSize,
            fontWeight: 700,
            color: BRAND_COLORS.muted,
            lineHeight: 1.1,
          }}
        >
          {nameA}
        </div>
        <div style={{ display: "flex", fontSize: 40, fontWeight: 800, color: BRAND_COLORS.ink }}>{"→"}</div>
        <div style={{ display: "flex", fontSize: nameSize, fontWeight: 800, color: BRAND_COLORS.ink, lineHeight: 1.1, letterSpacing: -1 }}>{nameB}</div>
      </div>
      {sub ? <div style={{ display: "flex", fontSize: 26, color: BRAND_COLORS.muted, lineHeight: 1.4, maxWidth: 900 }}>{sub}</div> : null}
    </div>
  );
}

// Headline/sub containing a real "$..." figure -> the price pulled out into its own accent chip, mirroring app/software/[slug]/opengraph-image.tsx.
function PricingBody({ headline, sub, sizeKey }: { headline: string; sub: string; sizeKey: string }) {
  const priceMatch = `${headline} ${sub}`.match(/\$[\d][\d,.]*(?:\/\w+)?/);
  if (!priceMatch) return <StackedBody headline={headline} sub={sub} sizeKey={sizeKey} />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", fontSize: sizeKey === "square" ? 44 : 38, fontWeight: 800, color: BRAND_COLORS.ink, lineHeight: 1.15, letterSpacing: -1 }}>{headline}</div>
      <div style={{ display: "flex" }}>
        <div
          style={{
            display: "flex",
            fontSize: 44,
            fontWeight: 800,
            color: BRAND_COLORS.ink,
            background: ACCENT,
            borderRadius: 10,
            padding: "14px 28px",
          }}
        >
          {priceMatch[0]}
        </div>
      </div>
      {sub ? <div style={{ display: "flex", fontSize: 24, color: BRAND_COLORS.muted, lineHeight: 1.4 }}>{sub}</div> : null}
    </div>
  );
}

// sub is a "; "-joined pick list -> numbered rows, distinct from a single stacked block.
function AlternativesBody({ headline, sub, sizeKey }: { headline: string; sub: string; sizeKey: string }) {
  const picks = sub
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);
  if (picks.length < 2) return <StackedBody headline={headline} sub={sub} sizeKey={sizeKey} />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", fontSize: sizeKey === "square" ? 46 : 40, fontWeight: 800, color: BRAND_COLORS.ink, lineHeight: 1.15, letterSpacing: -1.5 }}>{headline}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {picks.map((pick, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                display: "flex",
                width: 36,
                height: 36,
                borderRadius: 8,
                background: BRAND_COLORS.stage,
                color: BRAND_COLORS.ink,
                fontSize: 18,
                fontWeight: 800,
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {i + 1}
            </div>
            <div style={{ display: "flex", fontSize: 24, color: BRAND_COLORS.ink, lineHeight: 1.3 }}>{pick}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// "{N} {Category} tools, ..." -> the count pulled into a large stat, mirroring app/category/[slug]/opengraph-image.tsx.
function CategoryBody({ headline, sub, sizeKey }: { headline: string; sub: string; sizeKey: string }) {
  const match = headline.match(/^(\d+)\s+(.+?)\s+tools/i);
  if (!match) return <StackedBody headline={headline} sub={sub} sizeKey={sizeKey} />;
  const [, count, categoryName] = match;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
        <div style={{ display: "flex", fontSize: 96, fontWeight: 800, color: BRAND_COLORS.ink, lineHeight: 1 }}>{count}</div>
        <div style={{ display: "flex", fontSize: 18, fontWeight: 600, color: BRAND_COLORS.subtle, letterSpacing: 1 }}>TOOLS</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", fontSize: sizeKey === "square" ? 44 : 38, fontWeight: 800, color: BRAND_COLORS.ink, lineHeight: 1.15, letterSpacing: -1 }}>{categoryName}</div>
        {sub ? <div style={{ display: "flex", fontSize: 24, color: BRAND_COLORS.muted, lineHeight: 1.4, maxWidth: 700 }}>{sub}</div> : null}
      </div>
    </div>
  );
}

const BODY_BY_KIND: Record<string, typeof StackedBody> = {
  comparison: ComparisonBody,
  switching: SwitchingBody,
  pricing: PricingBody,
  alternatives: AlternativesBody,
  category: CategoryBody,
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sizeKey = searchParams.get("size") ?? "square";
  const kind = searchParams.get("kind") ?? "";
  const { width, height } = SIZES[sizeKey] ?? SIZES.square!;
  const headline = (searchParams.get("headline") ?? SITE_NAME).slice(0, 140);
  const sub = (searchParams.get("sub") ?? "").slice(0, 220);
  const badge = (searchParams.get("badge") ?? KIND_LABELS[kind] ?? "").slice(0, 40);
  const Body = BODY_BY_KIND[kind] ?? StackedBody;
  const logoDataUri = await loadCanonicalLogoDataUri();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: BRAND_COLORS.canvas,
        }}
      >
        <Header badge={badge} logoDataUri={logoDataUri} />
        <Body headline={headline} sub={sub} sizeKey={sizeKey} />
        <Footer />
      </div>
    ),
    { width, height, fonts: await loadBrandFonts() }
  );
}

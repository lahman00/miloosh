import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { BRAND_COLORS, BRAND_FONT_FAMILY } from "@/lib/brand";
import { SITE_TAGLINE } from "@/lib/site";
import { loadBrandFonts } from "@/lib/social/fonts";
import { loadCanonicalWordmarkDataUri, wordmarkWidthForHeight } from "@/lib/social/logo";
import { buildCardCopy, type CardCopy } from "@/lib/social/card-model";

/**
 * Premium Miloosh social cards. The old route rendered white Inter text and
 * an extra text logo on a light background after the October 2026 redesign.
 * This route shares the exact approved warm tokens, Manrope and wordmark with
 * the live site. Content is intentionally summarized; full product details
 * belong in the linked article, not in an image where text can be clipped.
 *
 * Used by Facebook and LinkedIn scheduled/queued media; keep this route
 * compatible with existing size/kind/headline/sub/badge query parameters.
 */
const SIZES: Record<string, { width: number; height: number }> = {
  square: { width: 1080, height: 1080 },
  linkedin: { width: 1200, height: 627 },
  facebook: { width: 1200, height: 630 },
  x: { width: 1200, height: 675 },
};

const ink = BRAND_COLORS.ink;
const muted = BRAND_COLORS.muted;
const accent = BRAND_COLORS.accent;
const line = BRAND_COLORS.line;
const citrine = BRAND_COLORS.citrine;
const surface = BRAND_COLORS.surface;

function Header({ logoDataUri, badge, square }: { logoDataUri: string; badge: string; square: boolean }) {
  const logoHeight = square ? 61 : 53;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- Satori ImageResponse requires img */}
      <img
        src={logoDataUri}
        width={wordmarkWidthForHeight(logoHeight)}
        height={logoHeight}
        alt=""
        style={{ objectFit: "contain" }}
      />
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        border: `2px solid ${line}`, borderRadius: 100,
        padding: "12px 21px", background: surface,
        color: accent, fontSize: square ? 20 : 18,
        fontWeight: 800, letterSpacing: 1.5,
      }}>{badge}</div>
    </div>
  );
}

function Footer() {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      borderTop: `2px solid ${line}`, paddingTop: 21,
      color: muted, fontSize: 20, fontWeight: 600,
    }}>
      <div style={{ display: "flex" }}>{SITE_TAGLINE}</div>
      <div style={{ display: "flex", color: accent, fontWeight: 800 }}>miloosh.com</div>
    </div>
  );
}

function VendorPanel({ name, square }: { name: string; square: boolean }) {
  const size = name.length > 24 ? 32 : name.length > 17 ? 39 : square ? 53 : 51;
  return (
    <div style={{
      display: "flex", flex: 1, minWidth: 0,
      alignItems: "center", justifyContent: "center",
      background: surface, border: `2px solid ${line}`,
      borderRadius: 22, padding: "32px 24px", minHeight: square ? 185 : 154,
    }}>
      <div style={{
        display: "flex", color: ink, fontWeight: 800,
        fontSize: size, lineHeight: 1.12, letterSpacing: -1.3,
        textAlign: "center", overflowWrap: "break-word",
      }}>{name}</div>
    </div>
  );
}

function Comparison({ copy, square, switching = false }: { copy: CardCopy; square: boolean; switching?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: square ? 30 : 22, width: "100%" }}>
      <div style={{ display: "flex", fontSize: 19, fontWeight: 800, color: accent, letterSpacing: 2.3 }}>
        {switching ? "BEFORE YOU SWITCH" : "SOFTWARE DECISION"}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, width: "100%" }}>
        <VendorPanel name={copy.left!} square={square} />
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          background: citrine, color: ink, borderRadius: 999,
          width: square ? 91 : 83, height: square ? 91 : 83,
          flexShrink: 0, fontWeight: 800, fontSize: switching ? 37 : 26,
        }}>{switching ? "→" : "VS"}</div>
        <VendorPanel name={copy.right!} square={square} />
      </div>
      <div style={{
        display: "flex", justifyContent: "center", color: muted,
        fontSize: square ? 31 : 29, fontWeight: 600, textAlign: "center",
      }}>{copy.subtitle}</div>
    </div>
  );
}

function Heading({ children, square }: { children: string; square: boolean }) {
  const size = children.length > 65 ? square ? 54 : 49 : square ? 68 : 61;
  return <div style={{
    display: "flex", color: ink, fontSize: size, fontWeight: 800,
    lineHeight: 1.13, letterSpacing: -2, maxWidth: "100%",
  }}>{children}</div>;
}

function Stacked({ copy, square }: { copy: CardCopy; square: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: square ? 28 : 24, maxWidth: 1030 }}>
      <div style={{ display: "flex", width: 96, height: 11, background: citrine, borderRadius: 100 }} />
      <Heading square={square}>{copy.headline}</Heading>
      <div style={{ display: "flex", color: muted, fontSize: square ? 31 : 28, lineHeight: 1.35 }}>
        {copy.subtitle}
      </div>
      {copy.price ? (
        <div style={{ display: "flex", alignSelf: "flex-start", background: citrine, color: ink, borderRadius: 15, padding: "12px 23px", fontWeight: 800, fontSize: 31 }}>
          {copy.price}
        </div>
      ) : null}
    </div>
  );
}

function Alternatives({ copy, square }: { copy: CardCopy; square: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: square ? 29 : 20 }}>
      <Heading square={square}>{copy.headline}</Heading>
      <div style={{ display: "flex", gap: 14, width: "100%" }}>
        {copy.alternatives!.map((name, index) => (
          <div key={index} style={{
            display: "flex", flex: 1, minWidth: 0, minHeight: square ? 155 : 112,
            alignItems: "center", justifyContent: "center", gap: 12,
            padding: "15px 12px", borderRadius: 18,
            background: surface, border: `2px solid ${line}`,
          }}>
            <div style={{ display: "flex", color: accent, fontSize: 19, fontWeight: 800 }}>{index + 1}.</div>
            <div style={{ display: "flex", color: ink, fontSize: name.length > 19 ? 23 : 27, fontWeight: 800 }}>{name}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", color: muted, fontSize: 26 }}>{copy.subtitle}</div>
    </div>
  );
}

function Category({ copy, square }: { copy: CardCopy; square: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 42 }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        background: citrine, color: ink, borderRadius: 25,
        width: square ? 220 : 195, height: square ? 220 : 195,
        fontSize: square ? 105 : 96, fontWeight: 800, flexShrink: 0,
      }}>{copy.count}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", color: accent, fontWeight: 800, fontSize: 20, letterSpacing: 2 }}>TOOLS TO EXPLORE</div>
        <Heading square={square}>{copy.category!}</Heading>
        <div style={{ display: "flex", color: muted, fontSize: 26 }}>{copy.subtitle}</div>
      </div>
    </div>
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sizeKey = searchParams.get("size") ?? "square";
  const size = SIZES[sizeKey] ?? SIZES.square!;
  const square = size.width === size.height;
  const copy = buildCardCopy({
    kind: searchParams.get("kind"),
    headline: searchParams.get("headline"),
    sub: searchParams.get("sub"),
    badge: searchParams.get("badge"),
  });
  const logoDataUri = await loadCanonicalWordmarkDataUri();
  const body = copy.left && copy.right
    ? <Comparison copy={copy} square={square} switching={copy.kind === "switching"} />
    : copy.alternatives
      ? <Alternatives copy={copy} square={square} />
      : copy.count && copy.category
        ? <Category copy={copy} square={square} />
        : <Stacked copy={copy} square={square} />;

  return new ImageResponse(
    <div style={{
      width: "100%", height: "100%", display: "flex", flexDirection: "column",
      justifyContent: "space-between", padding: square ? 68 : 58,
      background: BRAND_COLORS.canvas, color: ink, fontFamily: BRAND_FONT_FAMILY,
    }}>
      <Header logoDataUri={logoDataUri} badge={copy.badge} square={square} />
      <div style={{ display: "flex", flex: 1, flexDirection: "column", justifyContent: "center", width: "100%" }}>
        {body}
      </div>
      <Footer />
    </div>,
    { width: size.width, height: size.height, fonts: await loadBrandFonts() },
  );
}

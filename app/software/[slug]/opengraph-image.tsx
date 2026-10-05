import { ImageResponse } from "next/og";
import { getAllSoftware, getSoftware } from "@/data/software";
import { getCategoryName } from "@/data/categories";
import { BRAND_COLORS } from "@/lib/brand";
import { loadBrandFonts } from "@/lib/social/fonts";
import { loadCanonicalLogoDataUri, logoWidthForHeight } from "@/lib/social/logo";

export const alt = "Software profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return getAllSoftware().map((software) => ({ slug: software.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const software = getSoftware(slug);
  const name = software?.name ?? "Miloosh";
  const categoryName = software ? getCategoryName(software.category) : "";
  const bestFor = software?.bestFor ?? "";
  const price = software?.pricing?.startingPrice;
  const priceModel = software?.pricing?.model;
  const priceLabel = price ? `From ${price}` : priceModel === "free" ? "Free" : priceModel === "open_source" ? "Open source" : null;
  const logoDataUri = await loadCanonicalLogoDataUri();
  const logoHeight = 38;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: BRAND_COLORS.canvas, color: BRAND_COLORS.ink }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <img src={logoDataUri} width={logoWidthForHeight(logoHeight)} height={logoHeight} alt="" />
          {categoryName ? <div style={{ display: "flex", fontSize: 17, fontWeight: 700, color: BRAND_COLORS.ink, background: BRAND_COLORS.stage, borderRadius: 999, padding: "8px 18px" }}>{categoryName.toUpperCase()}</div> : null}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 600, lineHeight: 1.03, letterSpacing: -3 }}>{name}</div>
          {bestFor ? <div style={{ display: "flex", fontSize: 26, color: BRAND_COLORS.muted, lineHeight: 1.4, maxWidth: 900 }}>{bestFor.length > 160 ? `${bestFor.slice(0, 157)}...` : bestFor}</div> : null}
          {priceLabel ? (
            <div style={{ display: "flex", marginTop: 8 }}>
              <div style={{ display: "flex", fontSize: 24, fontWeight: 700, color: BRAND_COLORS.ink, background: BRAND_COLORS.citrine, borderRadius: 10, padding: "11px 20px" }}>{priceLabel}</div>
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 22, color: BRAND_COLORS.muted }}>Software research you can verify.</div>
          <div style={{ display: "flex", width: 118, height: 11, borderRadius: 999, background: BRAND_COLORS.citrine }} />
        </div>
      </div>
    ),
    { ...size, fonts: await loadBrandFonts() },
  );
}

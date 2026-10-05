import { ImageResponse } from "next/og";
import { getAllCategories, getCategory } from "@/data/categories";
import { getSoftwareByCategory } from "@/lib/related";
import { BRAND_COLORS } from "@/lib/brand";
import { loadBrandFonts } from "@/lib/social/fonts";
import { loadCanonicalLogoDataUri, logoWidthForHeight } from "@/lib/social/logo";

export const alt = "Software category";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return getAllCategories().map((category) => ({ slug: category.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = getCategory(slug);
  const software = category ? getSoftwareByCategory(category.slug) : [];
  const names = software.slice(0, 4).map((s) => s.name);
  const logoDataUri = await loadCanonicalLogoDataUri();
  const logoHeight = 38;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: BRAND_COLORS.canvas, color: BRAND_COLORS.ink }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <img src={logoDataUri} width={logoWidthForHeight(logoHeight)} height={logoHeight} alt="" />
          <div style={{ display: "flex", fontSize: 18, fontWeight: 700, color: BRAND_COLORS.ink, background: BRAND_COLORS.citrine, borderRadius: 999, padding: "8px 18px" }}>
            CATEGORY
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 42 }}>
          <div style={{ display: "flex", width: 168, height: 168, borderRadius: 28, background: BRAND_COLORS.stage, alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 72, fontWeight: 800, lineHeight: 1 }}>{software.length}</div>
            <div style={{ display: "flex", marginTop: 8, fontSize: 18, fontWeight: 700, color: BRAND_COLORS.muted }}>TOOLS</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18, flex: 1 }}>
            <div style={{ display: "flex", fontSize: 68, fontWeight: 600, lineHeight: 1.05, letterSpacing: -3 }}>{category?.name ?? "Software"}</div>
            {names.length ? <div style={{ display: "flex", fontSize: 25, color: BRAND_COLORS.muted, lineHeight: 1.4 }}>Including {names.join(", ")}</div> : null}
          </div>
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

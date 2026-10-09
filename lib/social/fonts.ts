import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { BRAND_FONT_FAMILY } from "@/lib/brand";

/**
 * 2026-08-18 brand forensics — every ImageResponse in the app (OG images,
 * apple-icon, the /api/social/card generator) was rendering in Satori's
 * built-in fallback font, not the site's real Inter typeface, because
 * none of them passed a `fonts` option. Real Inter TTF weights (sourced
 * directly from Google Fonts' own CDN — the same binaries next/font/google
 * resolves to) are bundled in assets/fonts/ and loaded here once per
 * request. Node runtime only (fs) — see MILOOSH_SOCIAL_BRAND_STANDARD.md
 * for why the card route moved off edge runtime to use this.
 */

type OgFont = { name: string; data: ArrayBuffer; weight: 400 | 600 | 700 | 800; style: "normal" };

let cached: Promise<OgFont[]> | null = null;

async function loadWeight(file: string, weight: 400 | 600 | 700 | 800): Promise<OgFont> {
  const buffer = await readFile(join(process.cwd(), "assets", "fonts", file));
  return { name: "Inter", data: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), weight, style: "normal" };
}

export function loadInterFonts(): Promise<OgFont[]> {
  if (!cached) {
    cached = Promise.all([
      loadWeight("Inter-Regular.ttf", 400),
      loadWeight("Inter-SemiBold.ttf", 600),
      loadWeight("Inter-Bold.ttf", 700),
      loadWeight("Inter-ExtraBold.ttf", 800),
    ]);
  }
  return cached;
}

// The restored warm social artwork uses Manrope, while the existing social
// publishing service retains Inter until its own separate editorial review.
let brandFontsCached: Promise<OgFont[]> | null = null;
function loadBrandWeight(file: string, weight: 400 | 600 | 700 | 800): Promise<OgFont> {
  return readFile(join(process.cwd(), "assets", "fonts", file)).then((buffer) => ({
    name: BRAND_FONT_FAMILY,
    data: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
    weight,
    style: "normal" as const,
  }));
}
export function loadBrandFonts(): Promise<OgFont[]> {
  if (!brandFontsCached) brandFontsCached = Promise.all([
    loadBrandWeight("Manrope-Regular.ttf", 400),
    loadBrandWeight("Manrope-SemiBold.ttf", 600),
    loadBrandWeight("Manrope-Bold.ttf", 700),
    loadBrandWeight("Manrope-ExtraBold.ttf", 800),
  ]);
  return brandFontsCached;
}

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { BRAND_FONT_FAMILY } from "@/lib/brand";

type OgFont = { name: string; data: ArrayBuffer; weight: 400 | 600 | 700 | 800; style: "normal" };

let cached: Promise<OgFont[]> | null = null;

async function loadWeight(file: string, weight: 400 | 600 | 700 | 800): Promise<OgFont> {
  const buffer = await readFile(join(process.cwd(), "assets", "fonts", file));
  return {
    name: BRAND_FONT_FAMILY,
    data: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
    weight,
    style: "normal",
  };
}

/**
 * Social/OG artwork must use the same Manrope family as the redesigned site.
 * ImageResponse does not inherit next/font, so the exact local TTF assets are
 * bundled and passed explicitly.
 */
export function loadBrandFonts(): Promise<OgFont[]> {
  if (!cached) {
    cached = Promise.all([
      loadWeight("Manrope-Regular.ttf", 400),
      loadWeight("Manrope-SemiBold.ttf", 600),
      loadWeight("Manrope-Bold.ttf", 700),
      loadWeight("Manrope-ExtraBold.ttf", 800),
    ]);
  }
  return cached;
}

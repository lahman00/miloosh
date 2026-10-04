import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Canonical square Miloosh M. avatar used by structured data and generated
 * social artwork. The mark follows the redesigned forest/citrine identity.
 */

const LOGO_ASPECT_RATIO = 1;

let cached: Promise<string> | null = null;

export function loadCanonicalLogoDataUri(): Promise<string> {
  if (!cached) {
    cached = readFile(join(process.cwd(), "public", "logo-icon.png")).then(
      (buffer) => `data:image/png;base64,${buffer.toString("base64")}`
    );
  }
  return cached;
}

export function logoWidthForHeight(height: number): number {
  return Math.round(height * LOGO_ASPECT_RATIO);
}

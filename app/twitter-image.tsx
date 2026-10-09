import { ImageResponse } from "next/og";
import { SocialImageContent } from "@/components/SocialImageContent";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import { loadBrandFonts } from "@/lib/social/fonts";
import { loadCanonicalWordmarkDataUri } from "@/lib/social/logo";

export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const logoDataUri = await loadCanonicalWordmarkDataUri();
  return new ImageResponse(<SocialImageContent logoDataUri={logoDataUri} />, { ...size, fonts: await loadBrandFonts() });
}

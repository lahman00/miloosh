import { ImageResponse } from "next/og";
import { SocialBannerContent } from "@/components/SocialBannerContent";
import { loadBrandFonts } from "@/lib/social/fonts";
import { loadCanonicalLogoDataUri } from "@/lib/social/logo";

const WIDTH = 4200;
const HEIGHT = 700;

export async function GET() {
  const logoDataUri = await loadCanonicalLogoDataUri();
  return new ImageResponse(<SocialBannerContent logoDataUri={logoDataUri} scale="linkedin" />, {
    width: WIDTH,
    height: HEIGHT,
    fonts: await loadBrandFonts(),
  });
}

import { ImageResponse } from "next/og";
import { SocialBannerContent } from "@/components/SocialBannerContent";
import { loadBrandFonts } from "@/lib/social/fonts";

const WIDTH = 4200;
const HEIGHT = 700;

export async function GET() {
  return new ImageResponse(<SocialBannerContent scale="linkedin" />, {
    width: WIDTH,
    height: HEIGHT,
    fonts: await loadBrandFonts(),
  });
}

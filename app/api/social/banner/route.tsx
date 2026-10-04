import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { SocialBannerContent } from "@/components/SocialBannerContent";
import { loadBrandFonts } from "@/lib/social/fonts";

const SIZES = {
  linkedin: { width: 4200, height: 700, scale: "linkedin" },
  facebook: { width: 1640, height: 624, scale: "facebook" },
  x: { width: 1500, height: 500, scale: "x" },
  youtube: { width: 2560, height: 1440, scale: "youtube" },
} as const;

export async function GET(request: NextRequest) {
  const channel = request.nextUrl.searchParams.get("channel") ?? "linkedin";
  const config = SIZES[channel as keyof typeof SIZES] ?? SIZES.linkedin;
  return new ImageResponse(<SocialBannerContent scale={config.scale} />, {
    width: config.width,
    height: config.height,
    fonts: await loadBrandFonts(),
  });
}

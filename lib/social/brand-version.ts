import { SITE_URL } from "@/lib/site";
import { SOCIAL_BRAND_VERSION } from "@/lib/brand";

const TRUSTED_SOCIAL_ORIGINS = new Set([SITE_URL, "https://miloosh.com"]);

export function withCurrentSocialBrand(imageUrl: string | null): string | null {
  if (!imageUrl) return imageUrl;
  try {
    const url = new URL(imageUrl);
    if (!TRUSTED_SOCIAL_ORIGINS.has(url.origin) || url.pathname !== "/api/social/card") return imageUrl;
    url.searchParams.set("brand", SOCIAL_BRAND_VERSION);
    return url.toString();
  } catch {
    return imageUrl;
  }
}

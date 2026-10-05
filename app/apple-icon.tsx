import { ImageResponse } from "next/og";
import { loadCanonicalAvatarDataUri } from "@/lib/social/logo";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  const avatar = await loadCanonicalAvatarDataUri();
  return new ImageResponse(
    (
      <img src={avatar} width={180} height={180} alt="" />
    ),
    size,
  );
}

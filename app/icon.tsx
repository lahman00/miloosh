import { ImageResponse } from "next/og";
import { loadCanonicalAvatarDataUri } from "@/lib/social/logo";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
  const avatar = await loadCanonicalAvatarDataUri();
  return new ImageResponse(
    (
      <img src={avatar} width={32} height={32} alt="" />
    ),
    size,
  );
}

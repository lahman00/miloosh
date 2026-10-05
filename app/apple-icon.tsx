import { ImageResponse } from "next/og";
import { loadCanonicalLogoDataUri } from "@/lib/social/logo";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function Icon() {
  const logoDataUri = await loadCanonicalLogoDataUri();

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex" }}>
        <img src={logoDataUri} width={180} height={180} alt="" />
      </div>
    ),
    size,
  );
}

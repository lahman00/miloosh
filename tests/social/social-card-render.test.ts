import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import sharp from "sharp";
import { GET } from "@/app/api/social/card/route";

async function renderCard(query: Record<string, string>) {
  const url = new URL("http://localhost:3471/api/social/card");
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  const response = await GET(new NextRequest(url));
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("image/png");
  const png = Buffer.from(await response.arrayBuffer());
  return { png, image: sharp(png) };
}

function countDarkInk(data: Uint8Array, channels: number) {
  let dark = 0;
  for (let i = 0; i < data.length; i += channels) {
    if (data[i]! < 85 && data[i + 1]! < 110 && data[i + 2]! < 95) dark++;
  }
  return dark;
}

describe("rendered Miloosh social cards", () => {
  it("renders Asana vs Basecamp in 1200x627 with a real visible dark wordmark and two legible panels", async () => {
    const { image } = await renderCard({
      size: "linkedin", kind: "comparison",
      headline: "Asana vs Basecamp: what actually differs?",
      sub: "Asana best fits: Positioned for cross-functional teams operating at any scale. Basecamp best fits: Teams who want centralized coordination instead of scattered apps.",
    });
    const metadata = await image.metadata();
    expect([metadata.width, metadata.height]).toEqual([1200, 627]);
    const topLeft = await image.clone().extract({ left: 0, top: 0, width: 1, height: 1 }).raw().toBuffer();
    expect([...topLeft.subarray(0, 3)]).toEqual([248, 249, 244]);
    const logo = await image.clone().extract({ left: 55, top: 52, width: 275, height: 67 }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    expect(countDarkInk(logo.data, logo.info.channels)).toBeGreaterThan(1500);
    for (const left of [160, 740]) {
      const panel = await image.clone().extract({ left, top: 260, width: 290, height: 80 }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      expect(countDarkInk(panel.data, panel.info.channels)).toBeGreaterThan(200);
    }
  });

  it("renders square and Facebook formats with the same light/dark brand tokens", async () => {
    for (const size of ["square", "facebook"]) {
      const { image } = await renderCard({
        size, kind: "comparison", headline: "Asana vs Basecamp: what actually differs?",
      });
      const metadata = await image.metadata();
      expect([metadata.width, metadata.height]).toEqual(size === "square" ? [1080, 1080] : [1200, 630]);
      const topLeft = await image.clone().extract({ left: 0, top: 0, width: 1, height: 1 }).raw().toBuffer();
      expect([...topLeft.subarray(0, 3)]).toEqual([248, 249, 244]);
    }
  });
});

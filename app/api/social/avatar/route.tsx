import { readFile } from "node:fs/promises";
import { join } from "node:path";

export async function GET() {
  const image = await readFile(join(process.cwd(), "public", "logo-icon.png"));

  return new Response(image, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}

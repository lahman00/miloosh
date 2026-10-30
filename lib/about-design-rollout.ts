import holds from "@/data/design/about-rollout-holds.json";

/** Presentation only. A date passing never removes a hold. */
const protectedPaths = new Set(holds.paths);
export function usesAboutDesign(pathname: string): boolean {
  if (!/^\/(software|compare)\/[a-z0-9-]+$/.test(pathname)) return false;
  return !protectedPaths.has(pathname);
}

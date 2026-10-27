/** Release check: exits 1 if a previously admitted software/comparison URL has left the sitemap without a reviewed waiver. */
import sitemap from "@/app/sitemap";
import { DISCOVERY_BASELINE } from "@/data/seo/discovery-baseline";
import { DISCOVERY_INTENTIONAL_REMOVALS } from "@/data/seo/discovery-intentional-removals";
import { validateDiscoveryBaseline } from "@/lib/discovery-continuity";
import { checkDiscoverySentinel } from "@/lib/discovery-maintenance";

const problems = validateDiscoveryBaseline(DISCOVERY_BASELINE);
if (problems.length > 0) {
  console.error(`SEO sentinel FAILED: baseline registry invalid: ${problems.join("; ")}`);
  process.exit(1);
}
const paths = new Set(sitemap().map((entry) => new URL(entry.url).pathname));
const result = checkDiscoverySentinel(paths, DISCOVERY_BASELINE, DISCOVERY_INTENTIONAL_REMOVALS);
const total = DISCOVERY_BASELINE.software.length + DISCOVERY_BASELINE.comparisons.length;
console.log(`SEO sentinel: ${total} baseline URLs, ${result.missing.length} missing, ${result.waived.length} reviewed removals, ${result.invalidWaivers.length} invalid waivers`);
for (const path of result.missing) console.error(`  MISSING ${path}`);
for (const path of result.invalidWaivers) console.error(`  INVALID WAIVER ${path}`);
for (const path of result.staleWaivers) console.warn(`  note: waiver for ${path} but it is still in the sitemap`);
if (!result.ok) {
  console.error("Unreviewed removal of previously admitted URLs. Restore them, or add an exact reviewed entry to data/seo/discovery-intentional-removals.ts.");
  process.exit(1);
}

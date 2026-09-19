import { getAllFirstPartyEvents, type OutboundClickEvent } from "@/lib/analytics/events";
import { ACTIVE_PARTNERS } from "@/data/affiliate/active-partners";
import { getAllSoftware } from "@/data/software";

/**
 * MILOOSH CRITICAL MONETIZATION CLOSEOUT (2026-08-29) Critical Task 5 --
 * answers, per verified ACTIVE partner: which page, which CTA location,
 * how many outbound clicks, which tracking asset, and whether the
 * resolver currently classifies that product as active/direct/unverified.
 *
 * Builds on the SAME first-party event store the existing
 * /internal/outbound-clicks and /internal/partner-performance dashboards
 * already read (lib/analytics/events.ts's getAllFirstPartyEvents) -- this
 * does not introduce a new analytics vendor or a parallel event pipeline,
 * it aggregates the existing real data at a finer grain (by CTA location,
 * not just by product) than either existing dashboard currently shows.
 *
 * Partner-side signup/paid/commission data is not available locally and
 * is never estimated here -- only real, locally-recorded click counts are
 * reported.
 */

type CoverageRow = {
  slug: string;
  name: string;
  status: "active" | "direct" | "unverified";
  trackingAsset: string | null;
  byLocation: Array<{
    sourcePage: string;
    ctaLocation: string;
    clicks: number;
    testClicks: number;
    destinationsSeen: Set<string>;
  }>;
  totalClicks: number;
  totalTestClicks: number;
};

function isOutboundClick(event: { type: string }): event is OutboundClickEvent {
  return event.type === "outbound_click";
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.argv.includes("--allow-local")) {
    console.error("CTA COVERAGE = UNKNOWN — production analytics unavailable; not zero. Use --allow-local only for local diagnostics.");
    process.exitCode = 1;
    return;
  }
  const events = await getAllFirstPartyEvents();
  const clicks = events.filter(isOutboundClick);
  const software = getAllSoftware();
  const activeSlugSet = new Set(ACTIVE_PARTNERS.map((p): string => p.slug));

  const rows: CoverageRow[] = [];

  for (const partner of ACTIVE_PARTNERS) {
    const item = software.find((s) => s.slug === partner.slug);
    const productClicks = clicks.filter((c) => c.softwareSlug === partner.slug);

    const byLocationMap = new Map<string, CoverageRow["byLocation"][number]>();
    for (const click of productClicks) {
      const ctaLocation = click.ctaLocation ?? "(unspecified)";
      const key = `${click.path}::${ctaLocation}`;
      const existing = byLocationMap.get(key);
      if (existing) {
        if (click.isTest) existing.testClicks++;
        else existing.clicks++;
        existing.destinationsSeen.add(click.destination);
      } else {
        byLocationMap.set(key, {
          sourcePage: click.path,
          ctaLocation,
          clicks: click.isTest ? 0 : 1,
          testClicks: click.isTest ? 1 : 0,
          destinationsSeen: new Set([click.destination]),
        });
      }
    }

    const byLocation = [...byLocationMap.values()].sort((a, b) => b.clicks - a.clicks);

    rows.push({
      slug: partner.slug,
      name: item?.name ?? partner.slug,
      status: "active", // every row here IS in ACTIVE_PARTNERS by construction
      trackingAsset: partner.affiliateUrl,
      byLocation,
      totalClicks: byLocation.reduce((sum, r) => sum + r.clicks, 0),
      totalTestClicks: byLocation.reduce((sum, r) => sum + r.testClicks, 0),
    });
  }

  console.log("================================================================");
  console.log("   VERIFIED ACTIVE PARTNER CTA COVERAGE (observed events, NOT verified humans)   ");
  if (process.argv.includes("--allow-local")) console.log("LOCAL DIAGNOSTIC ONLY — not production totals");
  console.log("================================================================\n");
  console.log(`${rows.length} verified active partner(s), ${clicks.length} total outbound_click events in the log.\n`);

  rows.sort((a, b) => b.totalClicks - a.totalClicks);

  for (const row of rows) {
    console.log(`${row.name} [${row.slug}] -- status: ${row.status} -- ${row.totalClicks} non-test/unknown-marker observation(s), ${row.totalTestClicks} test click(s)`);
    console.log(`  Tracking asset: ${row.trackingAsset ?? "MISSING -- should not be possible for an ACTIVE_PARTNERS entry, investigate"}`);
    if (row.byLocation.length === 0) {
      console.log(`  No recorded outbound clicks for this product yet.`);
    } else {
      for (const loc of row.byLocation) {
        const destFlag = [...loc.destinationsSeen].join(",");
        console.log(`  - ${loc.sourcePage} | ${loc.ctaLocation} | ${loc.clicks} click(s) (${loc.testClicks} test) | destination=${destFlag}`);
      }
    }
    console.log("");
  }

  const nonActiveWithClicks = clicks.filter((c) => c.destination === "affiliate" && !activeSlugSet.has(c.softwareSlug));
  if (nonActiveWithClicks.length > 0) {
    console.log("⚠ ANOMALY: affiliate-destination clicks recorded for products NOT in ACTIVE_PARTNERS:");
    for (const c of nonActiveWithClicks) console.log(`  - ${c.softwareSlug} at ${c.path} (${c.ctaLocation ?? "unspecified"})`);
  } else {
    console.log("No anomalies: every recorded affiliate-destination click belongs to a currently-verified ACTIVE_PARTNERS entry.");
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main };

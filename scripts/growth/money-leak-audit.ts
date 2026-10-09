import { ACTIVE_PARTNERS, getActivePartner } from "@/data/affiliate/active-partners";
import { PUBLISHED_COMPARISONS } from "@/data/comparisons";
import { getSoftware } from "@/data/software";
import { ROLE_GUIDES } from "@/data/guides/registry";
import { pathToFileURL } from "node:url";

export function runMoneyLeakAudit() {
  console.log("================================================================");
  console.log("           MILOOSH ACTIVE AFFILIATE MONEY LEAK AUDIT           ");
  console.log("================================================================\n");

  console.log(`Active Monitored Partner Programs (${ACTIVE_PARTNERS.length}):`);
  ACTIVE_PARTNERS.forEach((p, idx) => {
    console.log(`  ${(idx + 1).toString().padStart(2, " ")}. [${p.slug.padEnd(18)}] -> ${p.affiliateUrl}`);
  });

  // 1. Software Page Coverage
  console.log("\n1. SOFTWARE PAGE MONETIZATION:");
  let softwareMonetized = 0;
  for (const p of ACTIVE_PARTNERS) {
    const sw = getSoftware(p.slug);
    if (sw) {
      softwareMonetized++;
      console.log(`  ✓ /software/${p.slug.padEnd(18)} exists and is monetized`);
    } else {
      console.log(`  ✗ /software/${p.slug.padEnd(18)} MISSING from catalog!`);
    }
  }
  console.log(`  Total Software Pages Monetized: ${softwareMonetized}/${ACTIVE_PARTNERS.length}`);

  // 2. Comparison Coverage
  console.log("\n2. COMPARISON MONETIZATION:");
  const totalComps = PUBLISHED_COMPARISONS.length;
  let singleMonetized = 0;
  let dualMonetized = 0;
  let unmonetized = 0;

  for (const [a, b] of PUBLISHED_COMPARISONS) {
    const aActive = !!getActivePartner(a);
    const bActive = !!getActivePartner(b);

    if (aActive && bActive) {
      dualMonetized++;
    } else if (aActive || bActive) {
      singleMonetized++;
    } else {
      unmonetized++;
    }
  }

  console.log(`  Total Published Comparisons:         ${totalComps}`);
  console.log(`  Dual-Monetized Comparisons:          ${dualMonetized}`);
  console.log(`  Single-Monetized Comparisons:        ${singleMonetized}`);
  console.log(`  Total Comparisons with >=1 Partner:  ${dualMonetized + singleMonetized} (${Math.round(((dualMonetized + singleMonetized) / totalComps) * 100)}%)`);
  console.log(`  Unmonetized Comparisons:             ${unmonetized}`);

  // 3. Role Guide Coverage
  console.log("\n3. ROLE GUIDE MONETIZATION:");
  let guidesMonetized = 0;
  for (const guide of ROLE_GUIDES) {
    const activePicks = guide.products.map(p => p.slug).filter(slug => !!getActivePartner(slug));
    if (activePicks.length > 0) {
      guidesMonetized++;
      console.log(`  ✓ ${guide.slug.padEnd(42)}: ${activePicks.length} active partner(s) (${activePicks.join(", ")})`);
    }
  }
  console.log(`\n  Role Guides Monetized:               ${guidesMonetized} / ${ROLE_GUIDES.length} (${Math.round((guidesMonetized / ROLE_GUIDES.length) * 100)}%)`);

  console.log("\n================================================================\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runMoneyLeakAudit();
}

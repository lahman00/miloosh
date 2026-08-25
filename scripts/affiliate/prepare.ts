import "./_load-env";
import { buildApplicationPack } from "@/lib/revenue/application-pack";
import { getFreshApplicationCandidates, getAllPriorities, type AffiliatePriorityBreakdown } from "@/lib/revenue/affiliate-priority";

function printPack(slug: string, priority: AffiliatePriorityBreakdown | undefined) {
  const pack = buildApplicationPack(slug);
  if (!pack) {
    console.log(`Unknown slug: ${slug}`);
    return;
  }

  const runtimeReady = Boolean(priority?.readyToApply && pack.readyToApply);
  const blockReason = priority?.blockReason ?? pack.operationalBlockReason;

  console.log(`\n=== Application pack: ${pack.productName} (${pack.slug}) ===`);
  console.log(`Ready to apply: ${runtimeReady ? "yes" : "no"}`);
  console.log(`Current relationship: ${pack.currentRelationshipStatus}`);
  console.log(`Pipeline: ${priority?.pipelineStatus ?? "unknown"}`);
  if (blockReason) console.log(`Blocked: ${blockReason}`);
  console.log(`Business: ${pack.businessName}`);
  console.log(`Website: ${pack.website}`);
  console.log(`Business email: ${pack.businessEmail}`);
  console.log(`LinkedIn: ${pack.linkedinUrl ?? "(missing — see owner action below)"}`);
  console.log(`Publisher classification: ${pack.classification}`);
  console.log(`\nDescription:\n${pack.description}`);
  console.log(`\nPromotion strategy:\n${pack.promotionStrategy}`);
  console.log(`\nApplication URL: ${pack.applicationUrl ?? "(unknown / not currently actionable)"}`);
  if (pack.program) {
    console.log(`Network: ${pack.program.networkName ?? "unknown"} | Commission: ${pack.program.commissionModel ?? "unknown"}`);
  }
  if (pack.missingOwnerInputs.length > 0) {
    console.log(`\nOwner action needed:`);
    for (const item of pack.missingOwnerInputs) console.log(`  - ${item}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const topFlag = args.includes("--top");
  const limitArg = args.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : 10;

  if (topFlag) {
    const candidates = (await getFreshApplicationCandidates()).slice(0, limit);
    console.log(`Preparing packs for the top ${candidates.length} genuine fresh application candidates...`);
    for (const candidate of candidates) printPack(candidate.slug, candidate);
    return;
  }

  const slugs = args.filter((arg) => !arg.startsWith("--"));
  if (slugs.length === 0) {
    console.log("Usage: npm run affiliate:prepare -- <slug> [<slug> ...]");
    console.log("   or: npm run affiliate:prepare -- --top --limit=10");
    process.exit(1);
  }

  const priorities = await getAllPriorities();
  const priorityBySlug = new Map(priorities.map((priority) => [priority.slug, priority]));
  for (const slug of slugs) printPack(slug, priorityBySlug.get(slug));
}

main();

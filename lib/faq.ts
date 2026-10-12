import type { Software } from "@/data/software";

function joinWithAnd(items: string[]): string {
  return items.length > 1 ? `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}` : items[0];
}

export function getSoftwareFaqItems(software: Software): Array<{
  question: string;
  answer: string;
}> {
  const altNames = software.alternatives.map((alternative) => alternative.name);
  const altList = joinWithAnd(altNames);

  const items = [
    {
      question: `What are the best alternatives to ${software.name}?`,
      answer: `Based on core features and use case fit, the strongest ${software.name} alternatives are ${altList}. See the comparison above for what each one does best.`,
    },
    {
      question: `How do I migrate from ${software.name} to a different tool?`,
      answer: `Most teams start by exporting their existing ${software.name} data, then importing it into the new tool while running both in parallel until the switch is complete.`,
    },
    {
      question: `Do ${software.name} alternatives integrate with the tools my team already uses?`,
      answer:
        "Integration support varies by tool — check each alternative's own integrations before switching workflows that depend on them.",
    },
  ];

  // Sprint 20 Phase 1/3 — grounded in the entry's own stored `platforms`
  // field (not every entry has one), so this question stays real instead
  // of being one more name-substituted template with no per-product
  // variance. Omitted rather than guessed when platforms isn't documented.
  if (software.platforms && software.platforms.length > 0) {
    items.push({
      question: `What platforms does ${software.name} run on?`,
      answer: `${software.name} is available on ${joinWithAnd(software.platforms)}, per its official site.`,
    });
  }

  return items;
}

/**
 * Questions whose answers are taken from the product's own stored data. Nothing here reads the same for every
 * product: the migration and integrations answers of getSoftwareFaqItems() were identical across 264 profiles and
 * said nothing specific, so the v2 profile template leaves them out instead of repeating them.
 */
export function getGroundedSoftwareFaqItems(software: Software): Array<{ question: string; answer: string }> {
  const items: Array<{ question: string; answer: string }> = [];

  if (software.alternatives.length > 0) {
    items.push({
      question: `What are the best alternatives to ${software.name}?`,
      answer: `Based on core features and use case fit, the strongest ${software.name} alternatives are ${joinWithAnd(software.alternatives.map((alternative) => alternative.name))}.`,
    });
  }

  if (software.platforms && software.platforms.length > 0) {
    items.push({
      question: `What platforms does ${software.name} run on?`,
      answer: `${software.name} is available on ${joinWithAnd(software.platforms)}, per its official site.`,
    });
  }

  return items;
}


// One-off: fixes the remaining reciprocal-alternatives asymmetry found during
// the 2026-08-27 Zoho affiliate sprint (see data/affiliate/ZOHO_OPPORTUNITY_MAP_2026-08-27.md,
// Phase 18 / Phase 8). Every target file below already has a real, published
// Miloosh comparison page against the matching Zoho product -- this script
// only adds the missing reverse `alternatives` entry, never a new comparison.
// Content is real and sourced from the Zoho product's own canonical
// data/software/*.json record, not fabricated.
//
// Surgical by construction: this does NOT JSON.parse + JSON.stringify the
// whole file (that would silently reformat every array in the file to a
// different style than the source used, e.g. collapsing
// `["a", "b"]` one-liners into multi-line arrays -- a real defect caught
// and reverted before this version). Instead it locates the exact byte
// range of the `"alternatives": [ ... ]` array in the RAW file text via a
// string-aware bracket-depth walk, and splices in only the new entry's own
// text at the end of that array. Every other byte in the file is untouched.
import fs from "node:fs";
import path from "node:path";

type AltEntry = { name: string; slug: string; description: string; best_for: string; strengths: string[] };

const ZOHO_ALT: Record<string, AltEntry> = {
  "zoho-crm": {
    name: "Zoho CRM",
    slug: "zoho-crm",
    description:
      "A cloud-based sales platform using the Zia AI assistant to manage leads, deals, and customer relationships with omnichannel engagement and no-code workflow automation.",
    best_for: "Businesses already using or considering the wider Zoho suite who want CRM bundled with dozens of adjacent apps",
    strengths: ["Zia AI assistant", "Deep Zoho-suite integration", "No-code workflow automation"],
  },
  "zoho-books": {
    name: "Zoho Books",
    slug: "zoho-books",
    description:
      "Cloud accounting software that automates core financial workflows, handles multi-currency invoicing, manages inventory, and integrates with the wider Zoho ecosystem.",
    best_for: "Small to mid-sized businesses and existing Zoho users wanting workflow automation and cost-effective multi-user accounting",
    strengths: ["Multi-currency invoicing", "Inventory tracking", "Deep Zoho-suite integration"],
  },
  "zoho-projects": {
    name: "Zoho Projects",
    slug: "zoho-projects",
    description: "An online project management platform for planning, tracking, and collaborating on work, with deep integration into the wider Zoho suite.",
    best_for: "Teams already using Zoho apps, and organizations wanting an affordable, feature-rich project tool",
    strengths: ["Gantt charts", "Zoho Invoice billing integration", "Affordable at scale"],
  },
  "zoho-desk": {
    name: "Zoho Desk",
    slug: "zoho-desk",
    description:
      "An AI-powered customer service platform that unifies support conversations across channels into one inbox, with a Zia AI assistant that handles routine tickets autonomously.",
    best_for: "Customer-first businesses wanting unified multichannel ticketing with AI automation",
    strengths: ["Zia AI ticket automation", "Unified multichannel inbox", "Deep Zoho-suite integration"],
  },
  "zoho-flow": {
    name: "Zoho Flow",
    slug: "zoho-flow",
    description: "An AI-powered integration platform that connects cloud and on-premises apps and automates workflows across departments.",
    best_for: "Businesses already using Zoho's app ecosystem who want no-code workflow automation across 1,000+ apps",
    strengths: ["Natural-language flow generation", "1,000+ app integrations", "Deluge scripting for custom logic"],
  },
};

const TARGETS: [string, string][] = [
  ["hubspot", "zoho-crm"],
  ["salesforce", "zoho-crm"],
  ["quickbooks-online", "zoho-books"],
  ["xero", "zoho-books"],
  ["freshbooks", "zoho-books"],
  ["wave", "zoho-books"],
  ["asana", "zoho-projects"],
  ["clickup", "zoho-projects"],
  ["trello", "zoho-projects"],
  ["jira", "zoho-projects"],
  ["linear", "zoho-projects"],
  ["basecamp", "zoho-projects"],
  ["shortcut", "zoho-projects"],
  ["smartsheet", "zoho-projects"],
  ["teamwork", "zoho-projects"],
  ["freshdesk", "zoho-desk"],
  ["help-scout", "zoho-desk"],
  ["zendesk", "zoho-desk"],
  ["crisp", "zoho-desk"],
  ["front", "zoho-desk"],
  ["gorgias", "zoho-desk"],
  ["happyfox", "zoho-desk"],
  ["intercom", "zoho-desk"],
  ["kayako", "zoho-desk"],
  ["liveagent", "zoho-desk"],
  ["reamaze", "zoho-desk"],
  ["tidio", "zoho-desk"],
  ["zapier", "zoho-flow"],
  ["make", "zoho-flow"],
  ["pipedream", "zoho-flow"],
  ["n8n", "zoho-flow"],
  ["ifttt", "zoho-flow"],
  ["power-automate", "zoho-flow"],
  ["tray-ai", "zoho-flow"],
  ["uipath", "zoho-flow"],
  ["workato", "zoho-flow"],
];

/** Finds [start, end) byte range of the array value following `"alternatives":` -- start is the index of `[`, end is the index just past the matching `]`. String-aware so brackets inside JSON string values never confuse the depth count. */
function findAlternativesArrayRange(text: string): { arrayStart: number; arrayEnd: number } {
  const keyIdx = text.indexOf('"alternatives"');
  if (keyIdx === -1) throw new Error('no "alternatives" key found');
  const bracketStart = text.indexOf("[", keyIdx);
  if (bracketStart === -1) throw new Error("no [ found after alternatives key");

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = bracketStart; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) return { arrayStart: bracketStart, arrayEnd: i + 1 };
    }
  }
  throw new Error("unterminated alternatives array");
}

/** Serializes one alternative entry matching the indentation style already used for the entries added in the pre-interruption commit (4-space-indented properties inside the array, 6-space-indented strengths). */
function serializeEntry(entry: AltEntry): string {
  const strengths = entry.strengths.map((s) => `        "${s}"`).join(",\n");
  return [
    "    {",
    `      "name": ${JSON.stringify(entry.name)},`,
    `      "slug": ${JSON.stringify(entry.slug)},`,
    `      "description": ${JSON.stringify(entry.description)},`,
    `      "best_for": ${JSON.stringify(entry.best_for)},`,
    '      "strengths": [',
    strengths,
    "      ]",
    "    }",
  ].join("\n");
}

let fixed = 0;
let alreadyPresent = 0;
let missingFile = 0;

for (const [targetSlug, zohoSlug] of TARGETS) {
  const filePath = path.join("data/software", `${targetSlug}.json`);
  if (!fs.existsSync(filePath)) {
    console.log(`MISSING FILE: ${filePath}`);
    missingFile++;
    continue;
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw); // validation only -- never used to rewrite the file
  const already = (parsed.alternatives ?? []).some((a: AltEntry) => a.slug === zohoSlug);
  if (already) {
    alreadyPresent++;
    continue;
  }

  const { arrayStart, arrayEnd } = findAlternativesArrayRange(raw);
  // Determine whether the array is empty (nothing but whitespace between the brackets) vs has existing entries.
  const inner = raw.slice(arrayStart + 1, arrayEnd - 1);
  const isEmpty = inner.trim().length === 0;
  const entryText = serializeEntry(ZOHO_ALT[zohoSlug]!);

  // Walk back from the closing `]` past whitespace to find where the last
  // real content ends (right after the previous entry's `}`, or right after
  // `[` if empty), so the new comma attaches to that content on the same
  // line -- matching the file's existing `},\n    {` convention -- instead
  // of dangling alone on its own line.
  let lastContentEnd = arrayEnd - 1;
  while (lastContentEnd > arrayStart && /\s/.test(raw[lastContentEnd - 1]!)) lastContentEnd--;

  const separator = isEmpty ? "\n" : ",\n";
  const closingPart = raw.slice(lastContentEnd, arrayEnd - 1); // original whitespace before `]`
  const newRaw = raw.slice(0, lastContentEnd) + separator + entryText + closingPart + raw.slice(arrayEnd - 1);

  // Re-parse the result to guarantee we produced valid JSON and did not corrupt anything else.
  const reparsed = JSON.parse(newRaw);
  if (JSON.stringify(reparsed) !== JSON.stringify({ ...parsed, alternatives: [...(parsed.alternatives ?? []), ZOHO_ALT[zohoSlug]] })) {
    throw new Error(`Semantic mismatch after edit for ${filePath} -- aborting without writing.`);
  }

  fs.writeFileSync(filePath, newRaw);
  fixed++;
  console.log(`fixed: ${targetSlug}.json += ${zohoSlug}`);
}

console.log(`\nDone. fixed=${fixed} alreadyPresent=${alreadyPresent} missingFile=${missingFile} total=${TARGETS.length}`);

const SEARCH_SLUG_OVERRIDES: Readonly<Record<string, string>> = {
  "reclaim.ai": "reclaim-ai",
  "monday.com": "monday",
  "superhuman mail": "superhuman",
  "highlevel (gohighlevel)": "gohighlevel",
  "highlevel": "gohighlevel",
  "go high level": "gohighlevel",
  "otter.ai": "otter-ai",
  "cal.com": "cal-com",
  "rocket.chat": "rocket-chat",
  "tray.ai": "tray-ai",
  "8am mycase": "mycase",
  "windsurf (now devin desktop)": "windsurf",
  "devin desktop": "windsurf",
  "mulesoft anypoint platform": "mulesoft",
  "apollo.io": "apollo-io",
  "fireflies.ai": "fireflies-ai",
  "plausible analytics": "plausible",
  "copy.ai": "copy-ai",
  "adobe marketo engage": "marketo-engage",
};

function normalizeLookup(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function slugifySoftwareSearch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function resolveSoftwareSearchSlug(value: string): string {
  const normalized = normalizeLookup(value);
  return SEARCH_SLUG_OVERRIDES[normalized] ?? slugifySoftwareSearch(value);
}

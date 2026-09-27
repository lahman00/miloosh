import fs from "node:fs";
import path from "node:path";
import promptsSeed from "@/data/growth/cloro/prompts.json";
import baselineSeed from "@/data/growth/cloro/baseline-20260927.json";
import {
  buildCloroReport,
  cloroReportSchema,
  cloroPromptSchema,
  cloroProviderSchema,
  estimateCloroCredits,
  observationFromResponse,
  type CloroProvider,
} from "@/lib/growth/cloro-visibility";

const readArg = (name: string) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const has = (name: string) => process.argv.includes(name);
const writeJson = (file: string, value: unknown) =>
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
const providers = (readArg("--providers") ?? "chatgpt,perplexity,google")
  .split(",").map(x => x.trim()).filter(Boolean).map(x => cloroProviderSchema.parse(x));
const country = (readArg("--country") ?? "US").toUpperCase();
const budget = Number(readArg("--budget") ?? "60");
const prompts = cloroPromptSchema.array().parse(promptsSeed);
const live = has("--live");
const endpoint: Readonly<Record<CloroProvider, string>> = {
  chatgpt: "chatgpt",
  perplexity: "perplexity",
  google: "google",
  gemini: "gemini",
};

function payload(provider: CloroProvider, prompt: (typeof prompts)[number]) {
  return provider === "google"
    ? { query: prompt.googleQuery, country, pages: 1 }
    : { prompt: prompt.prompt, country, include: { markdown: true } };
}

async function request(provider: CloroProvider, prompt: (typeof prompts)[number], key: string) {
  const capturedAt = new Date().toISOString();
  const response = await fetch(`https://api.cloro.dev/v1/monitor/${endpoint[provider]}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload(provider, prompt)),
  });
  const raw = await response.json();
  return {
    observation: observationFromResponse({
      prompt, provider, country, capturedAt,
      statusCode: response.status,
      creditsCharged: response.headers.get("X-Credits-Charged") ? Number(response.headers.get("X-Credits-Charged")) : null,
      requestId: response.headers.get("X-Request-Id"),
      raw,
    }),
    raw,
  };
}
async function main() {
  const out = readArg("--output") ?? "var/growth/cloro";
  fs.mkdirSync(path.join(out, "history"), { recursive: true });
  if (!live) {
    const report = cloroReportSchema.parse(baselineSeed);
    writeJson(path.join(out, "latest.json"), report);
    console.log(JSON.stringify({
      mode: report.mode,
      observations: report.observations.length,
      chargedCredits: report.chargedCredits,
      remainingCreditsEstimate: report.remainingCreditsEstimate,
      summary: report.summary,
      note: "Read-only baseline. Add --live to spend credits.",
    }));
    return;
  }

  if (!Number.isFinite(budget) || budget < 0) throw new Error("--budget must be a nonnegative number");
  const estimatedCredits = estimateCloroCredits(prompts, providers);
  if (estimatedCredits > budget) {
    throw new Error(`Refusing Cloro run: estimated ${estimatedCredits} credits exceeds budget ${budget}`);
  }
  const key = process.env.CLORO_API_KEY;
  if (!key) throw new Error("CLORO_API_KEY is required only for --live runs");
  const observations = [];
  const rawDir = path.join(out, "raw", new Date().toISOString().replaceAll(":", "-"));
  fs.mkdirSync(rawDir, { recursive: true });
  for (const prompt of prompts) {
    for (const provider of providers) {
      const { observation, raw } = await request(provider, prompt, key);
      observations.push(observation);
      writeJson(path.join(rawDir, `${prompt.id}-${provider}.json`), raw);
      console.log(`${prompt.id} ${provider}: HTTP ${observation.statusCode}, credits=${observation.creditsCharged ?? "UNKNOWN"}, Miloosh=${observation.milooshMentioned || observation.milooshCited || observation.milooshOrganicPosition !== null}`);
    }
  }
  const charged = observations.every(row => row.creditsCharged !== null)
    ? observations.reduce((sum, row) => sum + (row.creditsCharged ?? 0), 0)
    : null;
  const generatedAt = new Date().toISOString();
  const report = buildCloroReport({
    generatedAt, mode: "LIVE", country, providers,
    estimatedCredits,
    chargedCredits: charged,
    remainingCreditsEstimate: charged === null ? null : Math.max(0, 500 - charged),
    observations,
  });
  writeJson(path.join(out, "latest.json"), report);
  writeJson(path.join(out, "history", generatedAt.replaceAll(":", "-") + ".json"), report);
  console.log(JSON.stringify({
    output: path.join(out, "latest.json"),
    chargedCredits: report.chargedCredits,
    summary: report.summary,
    rawResponses: rawDir,
  }));
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : "Cloro visibility run failed");
  process.exitCode = 1;
});

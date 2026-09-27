import { z } from "zod";

export const cloroProviderSchema = z.enum(["chatgpt", "perplexity", "google", "gemini"]);
export type CloroProvider = z.infer<typeof cloroProviderSchema>;

export const cloroPromptSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),
  googleQuery: z.string().min(1),
  kind: z.enum(["brand", "generic"]),
});
export type CloroPrompt = z.infer<typeof cloroPromptSchema>;

export const cloroSourceSchema = z.object({
  position: z.number().nullable(),
  title: z.string().nullable(),
  url: z.string().url(),
});

export const cloroObservationSchema = z.object({
  caseId: z.string().min(1),
  kind: z.enum(["brand", "generic"]),
  provider: cloroProviderSchema,
  query: z.string().min(1),
  country: z.string().length(2),
  capturedAt: z.iso.datetime({ offset: true }),
  statusCode: z.number().int(),
  creditsCharged: z.number().int().nonnegative().nullable(),
  requestId: z.string().nullable(),
  milooshMentioned: z.boolean(),
  milooshCited: z.boolean(),
  milooshOrganicPosition: z.number().int().positive().nullable(),
  sources: z.array(cloroSourceSchema),
});

export type CloroObservation = z.infer<typeof cloroObservationSchema>;

export const cloroReportSchema = z.object({
  generatedAt: z.iso.datetime({ offset: true }),
  mode: z.enum(["BASELINE_SEED", "LIVE"]),
  country: z.string().length(2),
  providers: z.array(cloroProviderSchema),
  estimatedCredits: z.number().int().nonnegative(),
  chargedCredits: z.number().int().nonnegative().nullable(),
  remainingCreditsEstimate: z.number().int().nonnegative().nullable(),
  observations: z.array(cloroObservationSchema),
  summary: z.object({
    brandRecognizedProviders: z.array(cloroProviderSchema),
    genericVisibleProviders: z.array(cloroProviderSchema),
    genericVisibleCases: z.array(z.string()),
    brandOnly: z.boolean(),
    noGenericVisibility: z.boolean(),
  }),
});

export type CloroReport = z.infer<typeof cloroReportSchema>;

export const SYNC_CREDIT_COST: Readonly<Record<CloroProvider, number>> = {
  chatgpt: 7,
  perplexity: 6,
  google: 5,
  gemini: 6,
};

export function estimateCloroCredits(prompts: CloroPrompt[], providers: CloroProvider[]) {
  return prompts.length * providers.reduce((sum, provider) => sum + SYNC_CREDIT_COST[provider], 0);
}

function sourceRows(raw: unknown, provider: CloroProvider) {
  const result = (raw && typeof raw === "object" ? (raw as Record<string, unknown>).result : null) as Record<string, unknown> | null;
  if (!result) return [] as z.infer<typeof cloroSourceSchema>[];
  const rows = provider === "google"
    ? ((result.organicResults ?? result.organic_results ?? result.organic ?? []) as unknown[])
    : ((result.sources ?? []) as unknown[]);
  return rows.flatMap((entry, index) => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Record<string, unknown>;
    const url = typeof row.url === "string" ? row.url : typeof row.link === "string" ? row.link : null;
    if (!url) return [];
    try {
      new URL(url);
      return [{
        position: typeof row.position === "number" ? row.position : index + 1,
        title: typeof row.title === "string" ? row.title : typeof row.label === "string" ? row.label : null,
        url,
      }];
    } catch {
      return [];
    }
  });
}

export function observationFromResponse(input: {
  prompt: CloroPrompt;
  provider: CloroProvider;
  country: string;
  capturedAt: string;
  statusCode: number;
  creditsCharged: number | null;
  requestId: string | null;
  raw: unknown;
}): CloroObservation {
  const rawText = JSON.stringify(input.raw).toLowerCase();
  const sources = sourceRows(input.raw, input.provider);
  const milooshRows = sources.filter(source => {
    try { return new URL(source.url).hostname.replace(/^www\./, "") === "miloosh.com"; }
    catch { return false; }
  });
  const organic = input.provider === "google" ? milooshRows[0]?.position ?? null : null;
  return cloroObservationSchema.parse({
    caseId: input.prompt.id,
    kind: input.prompt.kind,
    provider: input.provider,
    query: input.provider === "google" ? input.prompt.googleQuery : input.prompt.prompt,
    country: input.country,
    capturedAt: input.capturedAt,
    statusCode: input.statusCode,
    creditsCharged: input.creditsCharged,
    requestId: input.requestId,
    milooshMentioned: rawText.includes("miloosh"),
    milooshCited: milooshRows.length > 0,
    milooshOrganicPosition: organic,
    sources,
  });
}
export function summarizeCloro(observations: CloroObservation[]) {
  const successful = observations.filter(row => row.statusCode >= 200 && row.statusCode < 300);
  const brandRecognizedProviders = [...new Set(successful
    .filter(row => row.kind === "brand" && (row.milooshMentioned || row.milooshCited || row.milooshOrganicPosition !== null))
    .map(row => row.provider))];
  const genericVisible = successful.filter(row => row.kind === "generic" && (row.milooshMentioned || row.milooshCited || row.milooshOrganicPosition !== null));
  const genericVisibleProviders = [...new Set(genericVisible.map(row => row.provider))];
  const genericVisibleCases = [...new Set(genericVisible.map(row => row.caseId))];
  return {
    brandRecognizedProviders: cloroProviderSchema.array().parse(brandRecognizedProviders),
    genericVisibleProviders: cloroProviderSchema.array().parse(genericVisibleProviders),
    genericVisibleCases,
    brandOnly: brandRecognizedProviders.length > 0 && genericVisible.length === 0,
    noGenericVisibility: genericVisible.length === 0,
  };
}

export function buildCloroReport(input: Omit<CloroReport, "summary">): CloroReport {
  return cloroReportSchema.parse({ ...input, summary: summarizeCloro(input.observations) });
}

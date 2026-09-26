import { z } from "zod";

export const improvementSchema = z.object({
  url: z.string().startsWith("/"),
  source: z.string().min(1),
  deployedAt: z.iso.datetime({ offset: true }).nullable(),
  verification: z
    .object({
      checkedAt: z.iso.datetime({ offset: true }),
      deploymentId: z.string().min(1),
      finalUrl: z.string().url(),
      httpStatus: z.number(),
      canonical: z.string().url(),
      indexable: z.boolean(),
      sitemapIncluded: z.boolean(),
    })
    .nullable()
    .default(null),
});
export function hasProductionProof(
  change: z.infer<typeof improvementSchema> | undefined,
  now: string,
): boolean {
  if (!change?.deployedAt || !change.verification) return false;
  const v = change.verification,
    checked = Date.parse(v.checkedAt),
    clock = Date.parse(now);
  return (
    Number.isFinite(clock) &&
    checked >= Date.parse(change.deployedAt) &&
    checked <= clock &&
    clock - checked <= 7 * 86_400_000 &&
    v.httpStatus === 200 &&
    v.finalUrl === `https://miloosh.com${change.url}` &&
    v.canonical === v.finalUrl &&
    v.indexable &&
    v.sitemapIncluded
  );
}

import cohorts from "@/data/seo/template-cohorts.json";
import type { TemplateCohorts } from "@/lib/template-cohorts-build";

/**
 * Which pages may use the new page templates.
 *
 * Pages under a running measurement (experiment cohorts, release observation windows, work in flight in another
 * worktree) must keep their current text until the measurement closes, otherwise the measurement is spoiled. The
 * growth Director already computes that protection; `npm run seo:template-cohorts` writes its verdict for every
 * software page and comparison into data/seo/template-cohorts.json, and the templates read the result here.
 *
 * Owner decision, 2026-10-12: new templates apply to editable pages only; held pages join after their window
 * closes (2026-11-04 at the earliest). Regenerate the file when a window closes.
 */

const data = cohorts as TemplateCohorts;
const EDITABLE_PROFILES = new Set<string>(data.software.editable);

/** The software profile may use the current (v2) profile template. */
export function isProfileTemplateV2(slug: string): boolean {
  return EDITABLE_PROFILES.has(slug);
}


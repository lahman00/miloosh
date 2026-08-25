import fs from "node:fs";
import path from "node:path";
import { getAllSoftware } from "@/data/software";
import { CURRENT_AFFILIATE_LEDGER } from "@/data/affiliate/current-affiliate-truth";
import { getRevenueScores } from "@/lib/revenue/scoring";
import { getRevenueTier } from "@/lib/revenue/tiers";

/**
 * Legacy runtime affiliate-URL resolver.
 *
 * Security/truth boundary: an env/config URL can NEVER create a new Miloosh
 * affiliate relationship merely because the vendor has a public program. It is
 * honored only for a relationship already recorded ACTIVE in current affiliate
 * truth. New approvals must first be reconciled into the canonical relationship
 * state/active registry. This prevents an old or accidental env var from
 * reactivating a rejected, ended, pending or merely public program.
 *
 * Canonical registered partner URLs still take precedence in lib/affiliate.ts;
 * this resolver is a legacy fallback, not a higher-priority source of truth.
 */

export type AffiliateActivationSource = "env" | "config-file" | "none";

export type AffiliateActivation = {
  slug: string;
  affiliateId: string | null;
  affiliateUrl: string | null;
  isActive: boolean;
  source: AffiliateActivationSource;
};

type CredentialsFile = Record<string, { affiliateId?: string; affiliateUrl?: string }>;

const CONFIG_FILE_PATH = path.join(process.cwd(), "config", "affiliate-credentials.json");

function envVarName(slug: string, field: "ID" | "URL"): string {
  return `NEXT_PUBLIC_AFFILIATE_${field}_${slug.toUpperCase().replace(/-/g, "_")}`;
}

let cachedCredentialsFile: CredentialsFile | null = null;

function loadCredentialsFile(): CredentialsFile {
  if (cachedCredentialsFile) return cachedCredentialsFile;

  try {
    const contents = fs.readFileSync(CONFIG_FILE_PATH, "utf-8");
    cachedCredentialsFile = JSON.parse(contents) as CredentialsFile;
  } catch {
    cachedCredentialsFile = {};
  }

  return cachedCredentialsFile;
}

function hasCurrentActiveRelationship(slug: string): boolean {
  return CURRENT_AFFILIATE_LEDGER.some(
    (relationship) => relationship.status === "ACTIVE" && relationship.productSlugs.includes(slug),
  );
}

/**
 * Resolves a legacy runtime activation. Rejected/pending/public-only products
 * always return inactive even if an environment/config URL is present.
 */
export function getAffiliateActivation(slug: string): AffiliateActivation {
  if (!hasCurrentActiveRelationship(slug)) {
    return { slug, affiliateId: null, affiliateUrl: null, isActive: false, source: "none" };
  }

  const envId = process.env[envVarName(slug, "ID")]?.trim() || null;
  const envUrl = process.env[envVarName(slug, "URL")]?.trim() || null;

  if (envUrl) {
    return { slug, affiliateId: envId, affiliateUrl: envUrl, isActive: true, source: "env" };
  }

  const fileEntry = loadCredentialsFile()[slug];
  const fileUrl = fileEntry?.affiliateUrl?.trim() || null;
  const fileId = fileEntry?.affiliateId?.trim() || null;

  if (fileUrl) {
    return { slug, affiliateId: fileId, affiliateUrl: fileUrl, isActive: true, source: "config-file" };
  }

  return { slug, affiliateId: envId ?? fileId, affiliateUrl: null, isActive: false, source: "none" };
}

/** Tier A is computed from the current scoring model, not hardcoded. */
export function getTierASlugs(): string[] {
  return getRevenueScores(getAllSoftware())
    .filter((score) => getRevenueTier(score.totalScore) === "A")
    .map((score) => score.slug);
}

export function getTierAActivationStatus(): AffiliateActivation[] {
  return getTierASlugs().map(getAffiliateActivation);
}

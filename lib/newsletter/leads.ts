import fs from "node:fs";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";

/**
 * MILOOSH PEOPLE NOW mission (2026-08-23) — Email Acquisition Engine MVP.
 *
 * Storage backend follows the SAME convention as lib/revenue/events.ts
 * (one private Vercel Blob object per record when BLOB_READ_WRITE_TOKEN
 * is present, a local JSON-array fallback otherwise) with one deliberate
 * difference: a lead's blob key is a SHA-256 hash of the lowercased email
 * (`newsletter-leads/{hash}.json`), not a random UUID. Unlike an outbound
 * click (an independent event, no natural identity), a lead has a real
 * unique key -- the email itself -- and re-subscribing the same address
 * should update the existing record (new consent timestamp, latest
 * attribution) rather than create a duplicate that could later be
 * double-emailed. `allowOverwrite: true` here is intentional, not a
 * regression of the events.ts pattern.
 *
 * PRIVACY: this store is real, explicit, consented PII (an email
 * address) collected for a stated purpose (the newsletter) -- a
 * fundamentally different category from the anonymous, no-PII first-
 * party analytics store (lib/analytics/events.ts) and never merged with
 * it. Stored `access: "private"` (never a public Blob URL). An
 * unsubscribe always works, is never a dark pattern, and consent is
 * never pre-checked -- see app/api/newsletter/subscribe/route.ts and
 * components/newsletter/NewsletterSignupForm.tsx.
 */

export type NewsletterLead = {
  email: string;
  consentedAt: string;
  source: string; // e.g. "saas-cost-calculator", "newsletter-page" -- which surface captured this signup
  landingPath?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  visitorId?: string;
  isTest?: boolean;
  unsubscribeToken: string;
  unsubscribedAt: string | null;
};

const BLOB_PREFIX = "newsletter-leads/";
const LOCAL_FALLBACK_PATH = path.join(process.cwd(), "var", "newsletter-leads.json");
const MAX_STORED_LOCAL_LEADS = 5000;

function hasBlobToken(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function emailKey(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

function readLocalFallback(): NewsletterLead[] {
  try {
    const contents = fs.readFileSync(LOCAL_FALLBACK_PATH, "utf-8");
    const parsed: unknown = JSON.parse(contents);
    return Array.isArray(parsed) ? (parsed as NewsletterLead[]) : [];
  } catch {
    return [];
  }
}

function writeLocalFallback(leads: NewsletterLead[]): void {
  fs.mkdirSync(path.dirname(LOCAL_FALLBACK_PATH), { recursive: true });
  fs.writeFileSync(LOCAL_FALLBACK_PATH, JSON.stringify(leads.slice(-MAX_STORED_LOCAL_LEADS), null, 2));
}

export type SubscribeInput = {
  email: string;
  source: string;
  landingPath?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  visitorId?: string;
  isTest?: boolean;
};

/**
 * Records (or updates) a lead. Unlike best-effort click telemetry, a
 * subscription must only report success after persistence succeeds.
 * Throws a generic error on write failure; the route returns a retryable
 * response without exposing addresses, tokens or provider errors.
 */
export async function recordNewsletterLead(input: SubscribeInput): Promise<NewsletterLead> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const existing = await getLeadByEmail(normalizedEmail);

  const lead: NewsletterLead = {
    email: normalizedEmail,
    consentedAt: new Date().toISOString(),
    source: input.source,
    landingPath: input.landingPath,
    utmSource: input.utmSource,
    utmMedium: input.utmMedium,
    utmCampaign: input.utmCampaign,
    utmContent: input.utmContent,
    visitorId: input.visitorId,
    isTest: input.isTest,
    unsubscribeToken: existing?.unsubscribeToken ?? randomUUID(),
    // Re-subscribing (even after a prior unsubscribe) clears the
    // unsubscribe timestamp -- a fresh, explicit consent action.
    unsubscribedAt: null,
  };

  if (!hasBlobToken()) {
    try {
      const leads = readLocalFallback().filter((l) => l.email !== normalizedEmail);
      leads.push(lead);
      writeLocalFallback(leads);
    } catch {
      throw new Error("Newsletter storage unavailable");
    }
    return lead;
  }

  try {
    const { put } = await import("@vercel/blob");
    await put(`${BLOB_PREFIX}${emailKey(normalizedEmail)}.json`, JSON.stringify(lead), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
  } catch {
    throw new Error("Newsletter storage unavailable");
  }
  return lead;
}

export async function getLeadByEmail(email: string): Promise<NewsletterLead | null> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!hasBlobToken()) {
    return readLocalFallback().find((l) => l.email === normalizedEmail) ?? null;
  }
  try {
    const { head, get } = await import("@vercel/blob");
    const pathname = `${BLOB_PREFIX}${emailKey(normalizedEmail)}.json`;
    await head(pathname); // throws if the object doesn't exist -- cheaper than a full get() just to check
    const result = await get(pathname, { access: "private", useCache: false });
    if (!result || result.statusCode !== 200) return null;
    return JSON.parse(await new Response(result.stream).text()) as NewsletterLead;
  } catch {
    return null;
  }
}

/**
 * Marks a lead unsubscribed by their real unsubscribe token, not by a
 * guessable email lookup -- app/newsletter/unsubscribe/page.tsx is the
 * only caller. Never fabricates success: returns false if no lead
 * matches the token (an already-unsubscribed or invalid link shows an
 * honest "not found" state, not a fake confirmation).
 */
export async function unsubscribeByToken(token: string): Promise<boolean> {
  if (!hasBlobToken()) {
    const leads = readLocalFallback();
    const lead = leads.find((l) => l.unsubscribeToken === token);
    if (!lead) return false;
    lead.unsubscribedAt = new Date().toISOString();
    writeLocalFallback(leads);
    return true;
  }

  try {
    const { list, put, get } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: BLOB_PREFIX });
    for (const blob of blobs) {
      const result = await get(blob.pathname, { access: "private", useCache: false });
      if (!result || result.statusCode !== 200) continue;
      const lead = JSON.parse(await new Response(result.stream).text()) as NewsletterLead;
      if (lead.unsubscribeToken !== token) continue;
      lead.unsubscribedAt = new Date().toISOString();
      await put(blob.pathname, JSON.stringify(lead), { access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json" });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** Full lead list -- powers a future /internal report. Active (non-unsubscribed) leads only unless includeUnsubscribed is set. */
export async function getAllNewsletterLeads(includeUnsubscribed = false): Promise<NewsletterLead[]> {
  let leads: NewsletterLead[];
  if (!hasBlobToken()) {
    leads = readLocalFallback();
  } else {
    try {
      const { list, get } = await import("@vercel/blob");
      const { blobs } = await list({ prefix: BLOB_PREFIX });
      const results = await Promise.all(
        blobs.map(async (blob) => {
          try {
            const result = await get(blob.pathname, { access: "private", useCache: false });
            if (!result || result.statusCode !== 200) return null;
            return JSON.parse(await new Response(result.stream).text()) as NewsletterLead;
          } catch {
            return null;
          }
        })
      );
      leads = results.filter((l): l is NewsletterLead => l !== null);
    } catch {
      leads = [];
    }
  }
  return includeUnsubscribed ? leads : leads.filter((l) => !l.unsubscribedAt);
}

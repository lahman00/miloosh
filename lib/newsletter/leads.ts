import fs from "node:fs";
import path from "node:path";
import { get as getBlob, list as listBlobs, put as putBlob } from "@vercel/blob";
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
 * it. Stored `access: "private"` (never a public Blob URL). Unsubscribe
 * failures must remain explicit; consent is never pre-checked -- see app/api/newsletter/subscribe/route.ts and
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

const BLOB_PREFIX = "newsletter-leads/";
const LOCAL_FALLBACK_PATH = path.join(process.cwd(), "var", "newsletter-leads.json");
const storageError = () => new Error("Newsletter storage unavailable");
const hasBlobToken = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const emailKey = (email: string) => createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
const blobPath = (email: string) => `${BLOB_PREFIX}${emailKey(email)}.json`;
const validDate = (value: unknown): value is string => typeof value === "string" && Number.isFinite(Date.parse(value));

// רשומה פגומה אינה רשומה חסרה; אין לדלג עליה או לדרוס אותה בשקט.
function checkedLead(value: unknown): NewsletterLead {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw storageError();
  const row = value as Record<string, unknown>;
  if (typeof row.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)
    || row.email !== row.email.trim().toLowerCase() || !validDate(row.consentedAt)
    || typeof row.source !== "string" || !row.source
    || typeof row.unsubscribeToken !== "string" || !row.unsubscribeToken
    || !(row.unsubscribedAt === null || validDate(row.unsubscribedAt))
    || !(row.isTest === undefined || typeof row.isTest === "boolean")) throw storageError();
  for (const key of ["landingPath", "utmSource", "utmMedium", "utmCampaign", "utmContent", "visitorId"]) {
    if (row[key] !== undefined && typeof row[key] !== "string") throw storageError();
  }
  return value as NewsletterLead;
}

function readLocalFallback(): NewsletterLead[] {
  let contents: string;
  try { contents = fs.readFileSync(LOCAL_FALLBACK_PATH, "utf8"); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw storageError();
  }
  try {
    const rows: unknown = JSON.parse(contents);
    if (!Array.isArray(rows)) throw storageError();
    return rows.map(checkedLead);
  } catch { throw storageError(); }
}

function writeLocalFallback(leads: NewsletterLead[]): void {
  const temp = `${LOCAL_FALLBACK_PATH}.${randomUUID()}.tmp`;
  try {
    fs.mkdirSync(path.dirname(LOCAL_FALLBACK_PATH), { recursive: true });
    // אין חיתוך רשומות. החלפה אטומית שומרת את המקור במקרה של כתיבה שנכשלה.
    fs.writeFileSync(temp, JSON.stringify(leads, null, 2), { encoding: "utf8", mode: 0o600, flag: "wx" });
    fs.renameSync(temp, LOCAL_FALLBACK_PATH);
  } catch { throw storageError(); }
  finally { try { fs.unlinkSync(temp); } catch { /* בדרך כלל הקובץ כבר הועבר. */ } }
}

type StoredLead = { lead: NewsletterLead; etag: string; pathname: string };

async function readBlobRecord(pathname: string): Promise<StoredLead | null> {
  try {
    const result = await getBlob(pathname, { access: "private", useCache: false });
    // בגרסת SDK המותקנת null מוחזר רק בעקבות HTTP 404. יתר הכשלים נזרקים.
    if (result === null) return null;
    if (result.statusCode !== 200) throw storageError();
    const lead = checkedLead(JSON.parse(await new Response(result.stream).text()));
    if (blobPath(lead.email) !== pathname) throw storageError();
    return { lead, pathname, etag: result.blob.etag };
  } catch { throw storageError(); }
}

async function listBlobPaths(): Promise<string[]> {
  try {
    const paths = new Set<string>(), seenCursors = new Set<string>();
    let cursor: string | undefined;
    // הגבול מונע ריצה בלתי מוגבלת; הגעה אליו היא שגיאה, לעולם לא רשימה מלאה.
    for (let page = 0; page < 100; page++) {
      const batch = await listBlobs({ prefix: BLOB_PREFIX, limit: 1000, cursor });
      for (const blob of batch.blobs) {
        if (!/^newsletter-leads\/[a-f0-9]{64}\.json$/.test(blob.pathname)) throw storageError();
        paths.add(blob.pathname);
      }
      if (!batch.hasMore) return [...paths];
      if (!batch.cursor || seenCursors.has(batch.cursor)) throw storageError();
      seenCursors.add(batch.cursor); cursor = batch.cursor;
    }
    throw storageError();
  } catch { throw storageError(); }
}

async function saveBlobLead(lead: NewsletterLead, existing: StoredLead | null): Promise<void> {
  try {
    if (existing && !existing.etag) throw storageError();
    await putBlob(blobPath(lead.email), JSON.stringify(lead), {
      access: "private", addRandomSuffix: false, contentType: "application/json",
      // יצירה אינה דורסת מתחרה; עדכון מותר רק אם הגרסה שנקראה עדיין תקפה.
      ...(existing ? { ifMatch: existing.etag } : { allowOverwrite: false }),
    });
  } catch { throw storageError(); }
}

function newLead(input: SubscribeInput, existing: NewsletterLead | null): NewsletterLead {
  return {
    email: input.email.trim().toLowerCase(), consentedAt: new Date().toISOString(), source: input.source,
    landingPath: input.landingPath, utmSource: input.utmSource, utmMedium: input.utmMedium,
    utmCampaign: input.utmCampaign, utmContent: input.utmContent, visitorId: input.visitorId, isTest: input.isTest,
    unsubscribeToken: existing?.unsubscribeToken ?? randomUUID(),
    // רק הרשמה חדשה עם הסכמה מפורשת במסלול השרת מפעילה מחדש את הרשומה.
    unsubscribedAt: null,
  };
}

export async function recordNewsletterLead(input: SubscribeInput): Promise<NewsletterLead> {
  const email = input.email.trim().toLowerCase();
  if (!hasBlobToken()) {
    // מקומית הקריאה והכתיבה סינכרוניות באותו תהליך; אין הבטחת נעילה בין תהליכים.
    const leads = readLocalFallback();
    const lead = checkedLead(newLead(input, leads.find(l => l.email === email) ?? null));
    writeLocalFallback([...leads.filter(l => l.email !== email), lead]);
    return lead;
  }
  const stored = await readBlobRecord(blobPath(email));
  const lead = checkedLead(newLead(input, stored?.lead ?? null));
  await saveBlobLead(lead, stored);
  return lead;
}

export async function getLeadByEmail(email: string): Promise<NewsletterLead | null> {
  const normalized = email.trim().toLowerCase();
  if (!hasBlobToken()) return readLocalFallback().find(l => l.email === normalized) ?? null;
  return (await readBlobRecord(blobPath(normalized)))?.lead ?? null;
}

// true פירושו העדפה שנשמרה כמוסרת; false פירושו חיפוש מלא ללא התאמה.
// כשל אחסון נזרק בנפרד ומוצג במסך כמצב זמני, לא כקישור שגוי.
export async function unsubscribeByToken(token: string): Promise<boolean> {
  if (typeof token !== "string" || !token.trim() || token.length > 256) return false;
  if (!hasBlobToken()) {
    const leads = readLocalFallback(), lead = leads.find(l => l.unsubscribeToken === token);
    if (!lead) return false;
    if (lead.unsubscribedAt) return true;
    lead.unsubscribedAt = new Date().toISOString(); writeLocalFallback(leads); return true;
  }
  let failedRead = false;
  for (const pathname of await listBlobPaths()) {
    let stored: StoredLead | null;
    try {
      stored = await readBlobRecord(pathname);
      if (!stored) throw storageError();
    } catch { failedRead = true; continue; }
    if (stored.lead.unsubscribeToken !== token) continue;
    if (stored.lead.unsubscribedAt) return true;
    await saveBlobLead({ ...stored.lead, unsubscribedAt: new Date().toISOString() }, stored);
    return true;
  }
  if (failedRead) throw storageError();
  return false;
}

export async function getAllNewsletterLeads(includeUnsubscribed = false): Promise<NewsletterLead[]> {
  const leads: NewsletterLead[] = [];
  if (!hasBlobToken()) leads.push(...readLocalFallback());
  else {
    const paths = await listBlobPaths();
    for (let start = 0; start < paths.length; start += 8) {
      const batch = await Promise.all(paths.slice(start, start + 8).map(async pathname => {
        const stored = await readBlobRecord(pathname);
        if (!stored) throw storageError();
        return stored.lead;
      }));
      leads.push(...batch);
    }
  }
  return includeUnsubscribed ? leads : leads.filter(l => !l.unsubscribedAt);
}

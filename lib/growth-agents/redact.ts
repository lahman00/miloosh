/**
 * Reports are committed to a repository that may be public. Two things must
 * never reach them: affiliate or referral URLs and personal email addresses.
 * Page URLs on miloosh.com are the subject of the reports and are kept. The
 * name of a person's home folder (/Users/<name>, /home/<name>) is replaced too:
 * a report never needs it, and it identifies the machine's owner.
 */

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const URL_RE = /https?:\/\/[^\s"'<>)\]]+/g;
/** A folder path, not a URL path: the slash that starts it must not follow a URL-ish character. */
const HOME_FOLDER = /(?<![A-Za-z0-9._~:%@/-])\/(Users|home)\/[A-Za-z0-9._-]+/g;

function isOwnPage(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "miloosh.com" || host === "www.miloosh.com";
  } catch {
    return false;
  }
}

export function redactText(text: string): string {
  return text
    .replace(EMAIL, "<email-redacted>")
    .replace(URL_RE, (match) => (isOwnPage(match) ? match : "<url-redacted>"))
    .replace(HOME_FOLDER, "/$1/<user>");
}

export function redactDeep<T>(value: T): T {
  if (typeof value === "string") return redactText(value) as unknown as T;
  if (Array.isArray(value)) return value.map((item) => redactDeep(item)) as unknown as T;
  if (value instanceof Map || value instanceof Set) return value;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) out[key] = redactDeep(item);
    return out as T;
  }
  return value;
}

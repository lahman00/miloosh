import type { PublishResult } from "@/lib/social/types";

/**
 * A provider rejecting the stored credential (Facebook OAuth code 190/102,
 * Buffer "Access token is not valid", HTTP 401) is an owner action, not a
 * property of the post. Recording it as an ordinary FAILED burned one of
 * the post's three attempts and, for a single-channel entry, moved the
 * whole entry to FAILED, so an expired token drained the queue one due
 * entry at a time. Marked results stay retryable and consume no attempt.
 *
 * This only classifies a response the provider already returned. It never
 * reads, refreshes or alters a credential.
 */
export const AUTH_BLOCK_PREFIX = "AUTH_BLOCKED (owner re-authorization required): ";

// Narrow on purpose: "Post text is not valid" or a permission/scope error
// is a different problem and keeps its existing handling.
const AUTH_PATTERNS = [
  /AUTH_TOKEN_ERROR/,
  /OAuthException/,
  /access token (is )?(not valid|invalid|expired|has expired)/i,
  /invalid (oauth )?(access )?token/i,
  /\bHTTP 401\b/,
  /\bunauthori[sz]ed\b/i,
];

export function isAuthBlockedError(error: string | null | undefined): boolean {
  return Boolean(error?.startsWith(AUTH_BLOCK_PREFIX));
}

export function isProviderAuthFailure(result: Pick<PublishResult, "status" | "error">): boolean {
  if (result.status !== "FAILED") return false;
  if (isAuthBlockedError(result.error)) return true;
  return AUTH_PATTERNS.some((pattern) => pattern.test(result.error));
}

export function markAuthBlocked<T extends Pick<PublishResult, "error">>(result: T): T {
  return isAuthBlockedError(result.error) ? result : { ...result, error: `${AUTH_BLOCK_PREFIX}${result.error}` };
}

export function isAuthBlockedResult(result: Pick<PublishResult, "status" | "error">): boolean {
  return result.status === "FAILED" && isAuthBlockedError(result.error);
}

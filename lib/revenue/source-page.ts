/**
 * Resolves the source page for outbound attribution without trusting an
 * arbitrary client string. Same-origin Referer is strongest because it is
 * request metadata supplied by the browser. The client pathname remains a
 * narrow fallback for privacy tools/browsers that omit Referer.
 *
 * Privacy rule: source attribution stores PATHNAME ONLY. Query strings are
 * deliberately discarded here because they may contain campaign tokens or
 * other unnecessary values; campaign attribution belongs in the dedicated
 * first-party analytics fields instead of the revenue click log.
 */
export function resolveOutboundSourcePage(
  referer: string | null,
  requestOrigin: string,
  clientSourcePage: unknown,
): string {
  if (referer) {
    try {
      const ref = new URL(referer);
      if (ref.origin === requestOrigin) {
        return ref.pathname.slice(0, 512) || "/";
      }
    } catch {
      // Ignore malformed Referer and use the restricted fallback below.
    }
  }

  if (typeof clientSourcePage === "string") {
    const value = clientSourcePage.trim();
    // usePathname() sends a pathname, not a URL. Keep this fallback limited
    // to a local path so external/spoofed URLs never become attribution data.
    if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\n") && !value.includes("\r") && !value.includes("?")) {
      return value.slice(0, 512);
    }
  }

  return "/unknown";
}

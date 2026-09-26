import { renderedHtml } from "@/lib/seo/rendered-html";
import { KNOWN_CTA_LOCATIONS } from "@/lib/analytics/cta-locations";
export type Merchant = { slug: string; active: boolean; homepage: string; ctaUrls: string[] };
export function auditRenderedCtas(html: string, merchants: Merchant[]) {
  const page = renderedHtml(html.replace(/<(script|style|template)\b[^>]*>[\s\S]*?<\/\1>/gi, ""));
  const findings: Array<{ code: string; href: string; slug: string | null; severity: "BLOCK" | "REVIEW" }> = [];
  let checked = 0;
  const add = (code: string, href: string, slug: string | null, severity: "BLOCK" | "REVIEW" = "BLOCK") => findings.push({ code, href, slug, severity });
  for (const a of page.links) {
    const marked = a["data-miloosh-link"];
    const merchant = merchants.find(m => m.slug === a["data-software-slug"]);
    const issued = merchants.find(m => m.active && m.ctaUrls.includes(a.href));
    if (marked) {
      checked++;
      if (!merchant) { add("UNKNOWN_MERCHANT", a.href, null); continue; }
      if (!KNOWN_CTA_LOCATIONS.has(a["data-cta-location"])) add("MISSING_OR_UNKNOWN_CTA_LOCATION", a.href, merchant.slug);
      if (marked === "commercial" && !merchant.ctaUrls.includes(a.href)) add("WRONG_COMMERCIAL_DESTINATION", a.href, merchant.slug);
      if (marked === "commercial" && merchant.active && !a.rel?.split(/\s+/).includes("sponsored")) add("MISSING_SPONSORED", a.href, merchant.slug);
      if (marked === "commercial" && !merchant.active && a.rel?.split(/\s+/).includes("sponsored")) add("NONACTIVE_SPONSORED", a.href, merchant.slug);
    }
    if (issued) {
      if (marked !== "commercial") add("AFFILIATE_BYPASSES_CANONICAL_TRACKER", a.href, issued.slug);
      if (!/affiliate|commission/i.test(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ""))) add("MISSING_DISCLOSURE", a.href, issued.slug);
    }
    // Only commercial copy is flagged; editorial documentation/pricing sources
    // are intentionally not required to use an affiliate URL.
    if (!marked && a.text !== a.href && /\b(try|buy|get started|visit|start (?:a |your )?(?:free )?trial)\b/i.test(a.text)) {
      const direct = merchants.find(m => { try { return new URL(a.href).hostname === new URL(m.homepage).hostname; } catch { return false; } });
      if (direct && !issued) add("POSSIBLE_UNTRACKED_MERCHANT", a.href, direct.slug, "REVIEW");
    }
  }
  return { checked, findings, requestsToMerchants: 0, limitation: "SSR markers identify canonical tracker contracts; event persistence is tested separately, never inferred from HTML." };
}

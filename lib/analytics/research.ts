/** Bounded event vocabulary shared by browser and server; no catalog/server imports. */
export const RESEARCH_PATHS = [
  "/research",
  "/research/saas-pricing-pressure-index-2026",
  "/research/customer-support-pricing-2026",
  "/research/crm-plan-gates-2026",
  "/research/cms-buying-decision-2026",
] as const;
export const RESEARCH_EVENTS = ["research_page_view", "research_source_click", "research_to_decision_click", "research_to_comparison_click"] as const;
export type ResearchEventType = typeof RESEARCH_EVENTS[number];
export const isResearchPath = (path: string) => (RESEARCH_PATHS as readonly string[]).includes(path);
export function researchLinkEvent(path: string, href: string, origin = "https://miloosh.com") {
  if (!isResearchPath(path)) return null;
  try {
    const target = new URL(href, origin);
    if (!["http:", "https:"].includes(target.protocol) || target.username || target.password) return null;
    if (target.origin !== origin) return { type: "research_source_click" as const, path, sourceHost: target.hostname };
    if (target.pathname.startsWith("/compare/") && /^\/compare\/[a-z0-9-]+$/.test(target.pathname)) return { type: "research_to_comparison_click" as const, path, targetPath: target.pathname };
    if (/^\/(?:software\/[a-z0-9-]+|best-[a-z0-9-]+|tools\/saas-cost-calculator|recommend)$/.test(target.pathname)) return { type: "research_to_decision_click" as const, path, targetPath: target.pathname };
  } catch { /* Invalid href is not telemetry. */ }
  return null;
}
export function validResearchEvent(data: Record<string, unknown>) {
  if (typeof data.path !== "string" || !isResearchPath(data.path)) return false;
  if (data.type === "research_page_view") return true;
  if (data.type === "research_source_click") return typeof data.sourceHost === "string" && /^[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$/i.test(data.sourceHost) && data.sourceHost.includes(".") && !/(^|\.)miloosh\.com$/i.test(data.sourceHost);
  if (typeof data.targetPath !== "string" || !data.targetPath.startsWith("/") || data.targetPath.startsWith("//") || /[?#]/.test(data.targetPath)) return false;
  return researchLinkEvent(data.path, data.targetPath)?.type === data.type;
}

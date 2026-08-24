import fs from "node:fs";
import path from "node:path";
import { makeFinding } from "@/lib/agents/finding";
import type { AgentRunFn } from "@/types/agents";

/**
 * Static source-code regression guard, complementing
 * qa-ga4-consent-static-check's live-HTTP check. Confirms the consent
 * files still exist and that components/Analytics.tsx's "ga" branch still
 * delegates to GoogleAnalyticsConsent rather than rendering raw
 * gtag.js Script tags directly (the pre-consent-mode implementation this
 * codebase deliberately moved away from — see docs/legal-and-trust.md
 * "GA4 consent mode"). A regression here is a real, checkable code fact,
 * not a guess.
 *
 * This module is reachable from the internal growth dashboard through the
 * agent registry. These source-code filesystem reads are runtime audit
 * inputs, not deployment assets. `turbopackIgnore` prevents Next/Turbopack's
 * NFT tracer from conservatively pulling the whole repository into that
 * server bundle while preserving the audit when the files are present.
 */

type RequiredSourceFile = { relativePath: string; absolutePath: string };

function projectPath(...segments: string[]): string {
  return path.join(/*turbopackIgnore: true*/ process.cwd(), ...segments);
}

const REQUIRED_FILES: readonly RequiredSourceFile[] = [
  { relativePath: "lib/consent.ts", absolutePath: projectPath("lib", "consent.ts") },
  { relativePath: "components/ConsentBanner.tsx", absolutePath: projectPath("components", "ConsentBanner.tsx") },
  { relativePath: "components/GoogleAnalyticsConsent.tsx", absolutePath: projectPath("components", "GoogleAnalyticsConsent.tsx") },
  { relativePath: "components/CookiePreferencesControl.tsx", absolutePath: projectPath("components", "CookiePreferencesControl.tsx") },
] as const;

const ANALYTICS_RELATIVE_PATH = "components/Analytics.tsx";
const ANALYTICS_PATH = projectPath("components", "Analytics.tsx");

export const run: AgentRunFn = async () => {
  const agentId = "qa-ga4-consent-code-audit";
  const findings = [];

  for (const { relativePath, absolutePath } of REQUIRED_FILES) {
    if (!fs.existsSync(absolutePath)) {
      findings.push(
        makeFinding({
          agentId,
          kind: "regression",
          severity: "critical",
          title: `Missing GA4 consent file: ${relativePath}`,
          description: `${relativePath} no longer exists. This is one of the four files that implement Consent Mode gating.`,
          location: relativePath,
          evidence: [`fs.existsSync(${relativePath}) === false`],
          confidence: 1,
          riskLevel: 3,
          recommendedAction: "Investigate immediately — do not deploy until restored or the removal is a deliberate, reviewed decision.",
          dedupeKey: `${agentId}:missing:${relativePath}`,
        })
      );
    }
  }

  if (fs.existsSync(ANALYTICS_PATH)) {
    const source = fs.readFileSync(ANALYTICS_PATH, "utf-8");
    const delegatesToConsent = source.includes("GoogleAnalyticsConsent");
    const rendersRawGtagScript = /googletagmanager\.com\/gtag\/js/.test(source);

    if (!delegatesToConsent || rendersRawGtagScript) {
      findings.push(
        makeFinding({
          agentId,
          kind: "regression",
          severity: "critical",
          title: "components/Analytics.tsx no longer delegates GA4 to the consent-gated component",
          description: `components/Analytics.tsx's "ga" branch ${delegatesToConsent ? "" : "no longer references GoogleAnalyticsConsent, and "}${rendersRawGtagScript ? "appears to render a raw gtag.js script tag directly" : ""}. This is the exact regression that would silently reintroduce always-on analytics.`,
          location: ANALYTICS_RELATIVE_PATH,
          evidence: [`Contains "GoogleAnalyticsConsent": ${delegatesToConsent}`, `Contains raw gtag.js script src: ${rendersRawGtagScript}`],
          confidence: 1,
          riskLevel: 3,
          recommendedAction: "Investigate immediately before deploying — this is a privacy-posture regression.",
          dedupeKey: `${agentId}:analytics-delegation`,
        })
      );
    }
  }

  return {
    summary: findings.length === 0 ? "GA4 consent code audit passed: all files present, Analytics.tsx delegates correctly." : `GA4 consent code audit found ${findings.length} problem(s).`,
    findings,
  };
};

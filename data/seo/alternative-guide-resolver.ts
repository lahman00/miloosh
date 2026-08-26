import {
  ALTERNATIVE_GUIDES,
  getAlternativeGuide as getCoreAlternativeGuide,
} from "./alternative-guides";
import type {
  AlternativeDecision,
  AlternativeGuide as CoreAlternativeGuide,
} from "./alternative-guides";

export { ALTERNATIVE_GUIDES };
export type { AlternativeDecision };

export type OriginalProductFit = {
  softwareSlug: string;
  heading: string;
  fit: string;
  ctaLabel: string;
};

export type AlternativeGuide = CoreAlternativeGuide & {
  originalFit?: OriginalProductFit;
};

/**
 * Revenue-surface guides added after the original GSC execution cohort.
 * They remain separate from that fixed cohort so its historical, evidence-
 * specific test does not get rewritten whenever a later commercial surface
 * earns editorial coverage.
 *
 * `originalFit` is deliberately present only on products with first-party
 * partner activity already observed. It gives the decision guide an honest
 * "keep the current product" route instead of making every reader choose a
 * competitor. Affiliate status never creates the fit; the fit text is sourced
 * from the same verified product record used by the rest of the page.
 */
export const REVENUE_ALTERNATIVE_GUIDES: Readonly<Record<string, AlternativeGuide>> = {
  krispcall: {
    diagnosis:
      "KrispCall's three curated alternatives serve materially different operating models: AI-assisted calling, enterprise unified communications, and a support-led business VoIP suite. A plain alternatives list does not explain which requirement should drive the choice.",
    heading: "Choose a business-phone alternative by operating model",
    introduction:
      "KrispCall combines global business numbers, a unified calling and messaging inbox, call recording, IVR, a power dialer, and CRM integrations. A different product becomes relevant when the buying decision is really about native live AI assistance, enterprise-wide communications and contact-center depth, or a US-and-Canada-focused VoIP platform with broader collaboration and support coverage.",
    whySeekAlternative: [
      "Native live call transcription, AI summaries, sentiment analysis, or real-time agent coaching is central to the workflow.",
      "The organization needs phone, video, team messaging, and contact-center capabilities in a broader enterprise communications platform.",
      "Domestic US and Canada calling, team collaboration, and around-the-clock live support matter more than global-number coverage.",
    ],
    originalFit: {
      softwareSlug: "krispcall",
      heading: "Keep KrispCall for global numbers and a focused business-phone stack",
      fit: "KrispCall remains the direct fit when a small or growing team wants business numbers across 100+ countries, a unified calls/SMS/voicemail inbox, IVR, recording, a power dialer, and CRM integrations without buying a broader enterprise communications suite.",
      ctaLabel: "View KrispCall plans",
    },
    decisions: [
      {
        heading: "AI-assisted sales and support calls",
        fit: "Dialpad is the relevant comparison when live transcription, post-call AI summaries, sentiment analysis, and real-time coaching are core requirements.",
        alternativeSlug: "dialpad",
        comparisonSlug: "krispcall-vs-dialpad",
      },
      {
        heading: "Enterprise unified communications and contact center",
        fit: "RingCentral is the closer route when the organization wants business phone, video, team messaging, a large integration ecosystem, and contact-center tooling in one platform.",
        alternativeSlug: "ringcentral",
        comparisonSlug: "krispcall-vs-ringcentral",
      },
      {
        heading: "Support-led business VoIP for US and Canada",
        fit: "Nextiva fits teams prioritizing domestic US and Canada calling, team collaboration, CRM connections, and 24/7 live telephone support.",
        alternativeSlug: "nextiva",
        comparisonSlug: "krispcall-vs-nextiva",
      },
    ],
    evidenceSources: [
      "https://krispcall.com/pricing/",
      "https://krispcall.com/downloads/",
      "https://krispcall.com/what-is-krispcall/",
    ],
  },
  whatconverts: {
    diagnosis:
      "WhatConverts, CallRail, Ruler Analytics, and HubSpot overlap around marketing measurement but solve different scopes: granular lead-source tracking, call-first conversation intelligence, closed-loop revenue attribution, and an integrated CRM lifecycle. A flat alternatives list hides that buying distinction.",
    heading: "Choose a lead-attribution alternative by measurement scope",
    introduction:
      "WhatConverts attributes calls, forms, chats, and e-commerce transactions to campaigns and keywords, then adds lead qualification, valuation, reporting, and CRM export. A different product becomes relevant when phone conversations dominate the funnel, closed CRM revenue across a long B2B journey is the primary metric, or the team wants attribution inside a broader CRM and marketing platform.",
    whySeekAlternative: [
      "Inbound calls are the dominant lead source and AI transcription, sentiment, routing, and conversation intelligence are central requirements.",
      "The team needs multi-touch website journeys connected directly to closed CRM deal revenue rather than lead-level attribution alone.",
      "CRM records, marketing automation, sales activity, service workflows, and lifecycle reporting need to live in one vendor ecosystem.",
    ],
    originalFit: {
      softwareSlug: "whatconverts",
      heading: "Keep WhatConverts for lead-level source attribution across calls, forms, chats, and transactions",
      fit: "WhatConverts remains the focused choice when the team needs one lead record tied back to campaign and keyword data, qualification and lead value, agency reporting, and CRM export without replacing the existing CRM or marketing stack.",
      ctaLabel: "Start the 14-day WhatConverts trial",
    },
    decisions: [
      {
        heading: "Call-driven local lead tracking and conversation intelligence",
        fit: "CallRail is the relevant comparison for agencies and local-service teams that rely heavily on inbound phone leads and want dynamic number insertion, AI call transcripts, sentiment analysis, routing, and ad-platform sync.",
        alternativeSlug: "callrail",
        comparisonSlug: "whatconverts-vs-callrail",
      },
      {
        heading: "Closed-loop multi-touch attribution to CRM revenue",
        fit: "Ruler Analytics fits B2B teams with longer sales cycles that need visitor journeys, multiple attribution models, and closed-won CRM deal values pushed back to advertising and analytics platforms.",
        alternativeSlug: "ruler-analytics",
        comparisonSlug: "whatconverts-vs-ruler-analytics",
      },
      {
        heading: "CRM, marketing, sales, and service in one platform",
        fit: "HubSpot is the broader route when the priority is a native CRM database with marketing, sales, service, reporting, chat, and lifecycle activity in the same ecosystem rather than a dedicated lead-attribution product.",
        alternativeSlug: "hubspot",
        comparisonSlug: "whatconverts-vs-hubspot",
      },
    ],
    evidenceSources: [
      "https://whatconverts.com/",
      "https://whatconverts.com/features/",
      "https://whatconverts.com/pricing/",
      "https://whatconverts.com/about/",
    ],
  },
};

export function getAlternativeGuide(slug: string): AlternativeGuide | undefined {
  return REVENUE_ALTERNATIVE_GUIDES[slug] ?? getCoreAlternativeGuide(slug);
}

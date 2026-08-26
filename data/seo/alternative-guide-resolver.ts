import {
  getAlternativeGuide as getCoreAlternativeGuide,
  type AlternativeGuide,
} from "@/data/seo/alternative-guides";

/**
 * Revenue-surface guides added after the original GSC execution cohort.
 * They remain separate from that fixed cohort so its historical, evidence-
 * specific test does not get rewritten whenever a later commercial surface
 * earns editorial coverage.
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
};

export function getAlternativeGuide(slug: string): AlternativeGuide | undefined {
  return REVENUE_ALTERNATIVE_GUIDES[slug] ?? getCoreAlternativeGuide(slug);
}

/**
 * Profiles whose vendor's official site changed hands or moved after the facts were recorded. Each note says only what
 * the official pages showed on the check date, and that the recorded facts are not yet re-verified. Checked 2026-10-12.
 * Remove a note once the profile's facts have been re-confirmed against the current official pages.
 */
export type VendorStatusNote = { checkedOn: string; text: string; sourceUrl: string; sourceLabel: string };

export const VENDOR_STATUS_NOTES: Readonly<Record<string, VendorStatusNote>> = {
  clari: {
    checkedOn: "2026-10-12",
    text: "Clari's website now redirects to salesloft.com. On August 7, 2025 Clari and Salesloft announced a definitive agreement to merge. Pricing, features and security details below were recorded earlier and are not yet verified against the current official pages.",
    sourceUrl: "https://www.salesloft.com/company/newsroom/clari-and-salesloft-announce-merger-agreement",
    sourceLabel: "Official announcement",
  },
  windsurf: {
    checkedOn: "2026-10-12",
    text: "Windsurf's website and documentation now redirect to devin.ai, and the destination page was not available when checked. Pricing and features below were recorded earlier and are not yet verified against the current official pages.",
    sourceUrl: "https://windsurf.com/editor",
    sourceLabel: "Windsurf website",
  },
  coda: {
    checkedOn: "2026-10-12",
    text: "Coda's pricing page now redirects to superhuman.com, and the current page does not mention Coda. Pricing and features below were recorded earlier and are not yet verified against the current official pages.",
    sourceUrl: "https://superhuman.com/plans/docs",
    sourceLabel: "Current pricing page",
  },
  segment: {
    checkedOn: "2026-10-12",
    text: "Segment's pricing page now redirects to Twilio, which lists Twilio Segment with no published prices (\"Contact us for plan and add-on pricing\"). Plan names and prices below were recorded earlier and are not yet verified against the current official pages.",
    sourceUrl: "https://www.twilio.com/en-us/pricing/customer-data",
    sourceLabel: "Twilio Segment pricing page",
  },
};

/**
 * Profiles whose vendor's official site changed hands or moved after the facts were recorded. Each note says only what
 * the official pages showed on the check date, and that the recorded facts are not yet re-verified. Checked 2026-10-12.
 * Remove a note once the profile's facts have been re-confirmed against the current official pages.
 */
export type VendorStatusNote = { checkedOn: string; text: string; sourceUrl: string; sourceLabel: string };

export const VENDOR_STATUS_NOTES: Readonly<Record<string, VendorStatusNote>> = {
  clari: {
    checkedOn: "2026-10-12",
    text: "The official announcement published December 3, 2025 confirms that Clari and Salesloft completed their merger. Salesloft is now the company and platform brand; Clari Forecast retains its name. Pricing, features and security details below were recorded earlier and are not yet verified against the current official pages.",
    sourceUrl: "https://www.salesloft.com/company/newsroom/clari-salesloft-merger",
    sourceLabel: "Merger completion announcement (published December 3, 2025)",
  },
  windsurf: {
    checkedOn: "2026-10-12",
    text: "Windsurf's website now redirects to devin.ai, where Devin Desktop is described as the new name for Windsurf, with the existing plan and pricing unchanged. Pricing and features below were recorded earlier and are not yet verified against the current official pages.",
    sourceUrl: "https://devin.ai/desktop",
    sourceLabel: "Devin Desktop page",
  },
  coda: {
    checkedOn: "2026-10-12",
    text: "Coda's pricing page now redirects to Superhuman Docs plans. The prices below were read from that page on the date shown; other details were recorded earlier and are not yet verified against the current official pages.",
    sourceUrl: "https://superhuman.com/plans/docs",
    sourceLabel: "Current pricing page",
  },
  segment: {
    checkedOn: "2026-10-12",
    text: "Segment's pricing page now redirects to Twilio, whose page for Twilio Segment publishes no prices (\\\"Contact us for plan and add-on pricing\\\"). The prices recorded earlier were removed; other details are not yet verified against the current official pages.",
    sourceUrl: "https://www.twilio.com/en-us/pricing/customer-data",
    sourceLabel: "Twilio Segment pricing page",
  },
};

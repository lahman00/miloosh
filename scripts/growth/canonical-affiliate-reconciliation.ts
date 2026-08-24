import { getAllSoftware } from "@/data/software";
import { ACTIVE_PARTNERS } from "@/data/affiliate/active-partners";
import { AFFILIATE_PROGRAMS } from "@/data/revenue/affiliate-programs";
import { PARTNER_MATERIAL_AUDIT } from "@/data/affiliate/partner-materials-audit";
import { KNOWN_GSC_IMPRESSIONS } from "@/lib/growth-audit/comparison-graph";
import fs from "node:fs";
import path from "node:path";

export type CanonicalAffiliateStatus =
  | "ACTIVE"
  | "PENDING_REVIEW"
  | "REJECTED"
  | "READY_AND_VERIFIED"
  | "BLOCKED_FORM_DEFECT"
  | "OWNER_ACTION_REQUIRED"
  | "NO_REAL_PROGRAM_FOUND"
  | "EDITORIALLY_UNSUITABLE"
  | "UNVERIFIED_PROGRAM";

export interface CanonicalAffiliateRecord {
  slug: string;
  name: string;
  category: string;
  gscImpressions: number;
  status: CanonicalAffiliateStatus;
  network: string;
  commission: string;
  applicationUrl: string | null;
  affiliateUrl: string | null;
  evidenceSource: string;
  evidenceTimestamp: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  ownerBlocker: string | null;
  nextAction: string;
}

export function buildCanonicalAffiliateState(): {
  totalAudited: number;
  statusCounts: Record<CanonicalAffiliateStatus, number>;
  records: CanonicalAffiliateRecord[];
} {
  const software = getAllSoftware();
  const activeMap = new Map(ACTIVE_PARTNERS.map(p => [p.slug as string, p]));
  const progMap = new Map(AFFILIATE_PROGRAMS.map(p => [p.slug, p]));
  const materialMap = new Map(PARTNER_MATERIAL_AUDIT.map(m => [m.slug, m]));

  // Verified relationship truth as of 2026-08-24. Keep this list synchronized
  // with data/affiliate/active-partners.ts; the activeMap check below prevents
  // a slug from becoming ACTIVE without a real canonical tracking URL.
  const activeSet = new Set([
    "constant-contact", "todoist", "moosend", "volza", "pipedrive",
    "getresponse", "airtable", "monday", "whatconverts", "elevenlabs",
    "krispcall", "setmore", "hubstaff", "close", "shopify", "wix",
    "mailerlite", "omnisend", "surveymonkey"
  ]);

  // Freshworks/Freshdesk/Freshsales remain pending: the latest first-party
  // evidence available is an application-received confirmation and no
  // first-party rejection was found on 2026-08-24. Do not promote a bare
  // contradictory ledger enum into a vendor-decision claim.
  const pendingSet = new Set([
    "freshdesk", "freshsales", "freshbooks", "amplitude", "toggl-track",
    "callrail", "wrike", "zendesk"
  ]);

  const rejectedSet = new Set([
    "webflow", "activecampaign", "kit", "brevo", "hubspot", "n8n",
    "loom", "zapier", "canva", "help-scout", "clickup"
  ]);

  // The former BLOCKED_FORM_DEFECT cases were re-verified on 2026-08-23.
  // Their real current blockers are authenticated account / owner actions.
  const formBlockedSet = new Set<string>();

  const ownerBlockedMap: Record<string, string> = {
    "semrush": "Requires owner login / tax W-8/W-9 in Impact.com dashboard.",
    "lastpass": "Requires owner login / tax W-8/W-9 in Impact.com dashboard.",
    "woocommerce": "Requires owner login / tax W-8/W-9 in Impact.com dashboard.",
    "zoho-crm": "Requires creating a new Zoho account (password creation).",
    "zoho-books": "Requires creating a new Zoho account (password creation).",
    "zoho-projects": "Requires creating a new Zoho account (password creation).",
    "zoho-desk": "Requires creating a new Zoho account (password creation).",
    "gohighlevel": "Requires creating a new account with password.",
    "quickbooks-online": "US-audience restriction & customer-facing discount instead of affiliate payout.",
    "miro": "PartnerStack Account #1 search returned zero results. Requires owner check on account email.",
    "xero": "Requires an authenticated PartnerStack login to reach the application flow.",
    "trainual": "Requires an authenticated PartnerStack login; a direct vendor invite was received on 2026-08-24 but is not acceptance.",
    "tidio": "Requires an authenticated PartnerStack login to reach the join flow.",
    "synthesia": "Partner intake was submitted; final Rewardful account creation requires an owner-created password.",
    "gorgias": "Requires authenticated PartnerStack access and owner-confirmed publisher traffic/profile fields; do not fabricate agency/reseller claims."
  };

  const editorialUnsuitableSet = new Set([
    "pdware", "signal", "telegram", "tor"
  ]);

  const noProgramSet = new Set([
    "harvest", "time-doctor", "basecamp", "slite", "mattermost",
    "git", "postgresql", "mysql", "redis", "nginx", "docker", "kubernetes", "linux"
  ]);

  const counts: Record<CanonicalAffiliateStatus, number> = {
    ACTIVE: 0,
    PENDING_REVIEW: 0,
    REJECTED: 0,
    READY_AND_VERIFIED: 0,
    BLOCKED_FORM_DEFECT: 0,
    OWNER_ACTION_REQUIRED: 0,
    NO_REAL_PROGRAM_FOUND: 0,
    EDITORIALLY_UNSUITABLE: 0,
    UNVERIFIED_PROGRAM: 0
  };

  const records: CanonicalAffiliateRecord[] = [];

  for (const s of software) {
    const slug = s.slug;
    const gscImp = KNOWN_GSC_IMPRESSIONS[slug] ?? 0;
    const active = activeMap.get(slug);
    const prog = progMap.get(slug);
    const material = materialMap.get(slug);

    let status: CanonicalAffiliateStatus = "UNVERIFIED_PROGRAM";
    let network = prog?.networkName ?? material?.programNetwork ?? "UNKNOWN";
    let commission = material?.commission?.originalWording ?? prog?.commissionModel ?? "UNKNOWN";
    let appUrl = prog?.applicationUrl ?? null;
    let affUrl = active?.affiliateUrl ?? null;
    let evidenceSource = "Direct codebase catalog research";
    const evidenceTimestamp = "2026-08-24";
    let confidence: "HIGH" | "MEDIUM" | "LOW" = "HIGH";
    let ownerBlocker: string | null = null;
    let nextAction = "";

    if (activeSet.has(slug) && active && active.affiliateUrl) {
      status = "ACTIVE";
      affUrl = active.affiliateUrl;
      evidenceSource = "data/affiliate/active-partners.ts plus first-party relationship/link evidence";
      nextAction = "Live on Miloosh. Monitor real traffic, clicks, referrals, conversions and payout state separately.";
      if (slug === "setmore") {
        commission = "30% of first subscription payment (one-time)";
        nextAction = "Live. STRICT COMPLIANCE: NO PAID MEDIA / PPC. Organic only.";
      }
    } else if (pendingSet.has(slug)) {
      status = "PENDING_REVIEW";
      evidenceSource = "docs/affiliate-applications.md plus first-party PartnerStack/Gmail submission evidence";
      nextAction = "Application submitted. Wait for vendor decision. Do NOT re-apply or invent an outcome.";
      if (slug === "toggl-track") commission = "30% on first customer payment";
      if (slug === "freshbooks") commission = "$10/free trial, up to $200/paid plan";
    } else if (rejectedSet.has(slug)) {
      status = "REJECTED";
      evidenceSource = "docs/affiliate-applications.md plus first-party vendor rejection email/message";
      nextAction = "Vendor declined application. Do NOT re-apply without a material new reason and new evidence.";
      if (slug === "clickup") commission = "$28 T1 / $10 T2 / $2.50 T3 per signup";
      if (slug === "help-scout") commission = "15-20% per closed deal";
    } else if (formBlockedSet.has(slug)) {
      status = "BLOCKED_FORM_DEFECT";
      evidenceSource = "Historical PartnerStack form diagnosis";
      nextAction = "Tooling/form issue requires re-verification before retry.";
    } else if (ownerBlockedMap[slug]) {
      status = "OWNER_ACTION_REQUIRED";
      ownerBlocker = ownerBlockedMap[slug]!;
      evidenceSource = "Verified current account/application blocker";
      nextAction = `Blocked on owner action: ${ownerBlocker}`;
    } else if (editorialUnsuitableSet.has(slug)) {
      status = "EDITORIALLY_UNSUITABLE";
      evidenceSource = "docs/affiliate-applications.md & editorial policy";
      nextAction = "Not suitable for commercial affiliate monetization without an independently justified editorial surface.";
    } else if (noProgramSet.has(slug)) {
      status = "NO_REAL_PROGRAM_FOUND";
      evidenceSource = "Direct vendor website & URL checks";
      nextAction = "No verified public affiliate program found.";
    } else if (prog && prog.programExists === "yes" && prog.applicationUrl) {
      status = "READY_AND_VERIFIED";
      network = prog.networkName || "Direct";
      commission = prog.commissionModel || "UNKNOWN";
      appUrl = prog.applicationUrl;
      evidenceSource = "Official vendor affiliate page research";
      nextAction = `Submit truthful publisher application at ${appUrl}`;
    } else if (prog && prog.programExists === "no") {
      status = "NO_REAL_PROGRAM_FOUND";
      evidenceSource = "Vendor documentation";
      nextAction = "No public program.";
    } else {
      status = "UNVERIFIED_PROGRAM";
      commission = "UNKNOWN";
      confidence = "LOW";
      evidenceSource = "Catalog exploration queue";
      nextAction = "Requires direct vendor/program verification before any commercial action.";
    }

    counts[status]++;
    records.push({
      slug,
      name: s.name,
      category: s.category,
      gscImpressions: gscImp,
      status,
      network,
      commission,
      applicationUrl: appUrl,
      affiliateUrl: affUrl,
      evidenceSource,
      evidenceTimestamp,
      confidence,
      ownerBlocker,
      nextAction
    });
  }

  records.sort((a, b) => b.gscImpressions - a.gscImpressions);

  return {
    totalAudited: software.length,
    statusCounts: counts,
    records
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = buildCanonicalAffiliateState();
  const outPath = path.join(process.cwd(), "var/agents/canonical-affiliate-reconciliation.json");
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));

  console.log(`================================================================`);
  console.log(`        MILOOSH CANONICAL AFFILIATE SOURCE OF TRUTH             `);
  console.log(`================================================================\n`);
  console.log(`✓ Audited and reconciled all ${result.totalAudited} catalog software products.\n`);
  console.log(`CANONICAL STATUS BREAKDOWN:`);
  Object.entries(result.statusCounts).forEach(([status, count]) => {
    console.log(`   - ${status.padEnd(25)}: ${count}`);
  });
  console.log(`\nSAMPLE PENDING_REVIEW PROGRAMS:`);
  result.records.filter(r => r.status === "PENDING_REVIEW").forEach(r => {
    console.log(`   - [${r.slug}] Network: ${r.network} | Commission: ${r.commission} | Evidence: ${r.evidenceSource}`);
  });
  console.log(`\nSAMPLE KNOWN REJECTED PROGRAMS:`);
  result.records.filter(r => r.status === "REJECTED").forEach(r => {
    console.log(`   - [${r.slug}] Evidence: ${r.evidenceSource}`);
  });
}

import {
  PARTNER_MATERIAL_AUDIT as BASE_PARTNER_MATERIAL_AUDIT,
  type PartnerMaterialAudit,
} from "./partner-materials-audit-base";

export type {
  MonetizationReadiness,
  NormalizedCommissionType,
  PartnerMaterialAudit,
} from "./partner-materials-audit-base";

const JOTFORM_MATERIAL_AUDIT: PartnerMaterialAudit = {
  company: "Jotform",
  slug: "jotform",
  programNetwork: "Direct / Jotform Partnerships",
  currentStatus: "ACTIVE",
  applicationStatus: "Approved",
  approvalStatus: "Approved 2026-08-19",
  affiliateUrl: "https://www.jotform.com/?partner=miloosh",
  commission: {
    type: "recurring_percentage",
    value: "30% for first 12 months",
    originalWording: "30% commission on every new paid user for the first 12 months of the referred customer's subscription",
  },
  recurrence: "recurring for first 12 months",
  cookieWindow: "UNKNOWN",
  payoutThreshold: "UNKNOWN",
  payoutMethod: "UNKNOWN / dashboard verification required",
  qualificationRules: "60-day commission qualification period before commission becomes payable; this is not recorded as a cookie window",
  restrictions: "Use vendor-issued partner=miloosh tracking; other restrictions remain UNKNOWN until verified from current program terms/dashboard",
  ppcTrademarkRestrictions: "UNKNOWN",
  couponRestrictions: "UNKNOWN",
  emailRestrictions: "UNKNOWN",
  disclosureRequirements: "Miloosh disclosure and rel=sponsored rules apply whenever an affiliate URL is used.",
  geographyRestrictions: "UNKNOWN",
  selfReferralRules: "UNKNOWN",
  inactivityTerminationRules: "UNKNOWN",
  brandAssets: "Jotform dashboard available; specific brand asset permissions not separately verified",
  mediaKit: "UNKNOWN",
  brandGuidelines: "UNKNOWN",
  promotionalMaterials: "Custom Links dashboard confirmed by Jotform Partnerships",
  supportContact: "Anna Scheucher <annascheucher@jotform.com>; affiliates@jotform.com",
  evidence: [
    "First-party Jotform approval confirmation from Anna Scheucher dated 2026-08-26, stating approval occurred 2026-08-19",
    "First-party Jotform email dated 2026-08-26 supplying https://www.jotform.com/?partner=miloosh",
    "First-party Jotform email dated 2026-08-26 supplying https://www.jotform.com/pricing/?partner=miloosh",
    "data/affiliate/active-partners.ts",
    "data/affiliate/canonical-ledger.ts",
  ],
  lastVerifiedDate: "2026-08-26",
  readiness: "READY NOW",
  vendorClaims: [],
  verifiedMarketingFacts: [],
};

export const PARTNER_MATERIAL_AUDIT: readonly PartnerMaterialAudit[] = [
  ...BASE_PARTNER_MATERIAL_AUDIT,
  JOTFORM_MATERIAL_AUDIT,
] as const;

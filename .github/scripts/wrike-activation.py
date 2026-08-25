from pathlib import Path

REFERRAL_URL = "https://get.wrike.com/wdgn8ok7i5ij"

# Active partner registry
p = Path("data/affiliate/active-partners.ts")
text = p.read_text()
if 'slug: "wrike"' in text:
    raise SystemExit("Wrike is already active; refusing duplicate activation")
slug_anchor = '  "mailerlite", "omnisend", "surveymonkey",\n] as const;'
if slug_anchor not in text:
    raise SystemExit("active partner slug anchor missing")
text = text.replace(slug_anchor, '  "mailerlite", "omnisend", "surveymonkey", "wrike",\n] as const;', 1)
row_anchor = '  { slug: "surveymonkey", status: "active", affiliateUrl: "https://try.partnerstack.com/jx99ylh3mexb", blocker: null },\n] as const;'
if row_anchor not in text:
    raise SystemExit("active partner row anchor missing")
text = text.replace(
    row_anchor,
    '  { slug: "surveymonkey", status: "active", affiliateUrl: "https://try.partnerstack.com/jx99ylh3mexb", blocker: null },\n'
    f'  {{ slug: "wrike", status: "active", affiliateUrl: "{REFERRAL_URL}", blocker: null }},\n'
    '] as const;',
    1,
)
p.write_text(text)

# Canonical relationship ledger
p = Path("data/affiliate/canonical-ledger.ts")
text = p.read_text()
if 'programId: "wrike"' in text:
    raise SystemExit("Wrike already exists in canonical ledger")
text = text.replace("// 1. ACTIVE MONITORED PARTNERS (19 programs)", "// 1. ACTIVE MONITORED PARTNERS (20 programs)", 1)
anchor = '''  {
    programId: "constant-contact",'''
if anchor not in text:
    raise SystemExit("canonical active-section anchor missing")
record = f'''  {{
    programId: "wrike",
    programName: "Wrike Referral Program",
    network: "PartnerStack",
    productSlugs: ["wrike"],
    status: "ACTIVE",
    statusUpdatedAt: "2026-08-25",
    applicationSubmittedAt: null,
    decisionAt: "2026-08-25",
    affiliateUrl: "{REFERRAL_URL}",
    commissionModel: "Percentage of licenses sold / reward on qualified opportunities; exact rate not disclosed in the available first-party evidence",
    cookieWindow: null,
    evidence: [
      "First-party PartnerStack email dated 2026-08-25: Welcome to the Wrike Referral Program",
      "First-party Wrike referral-partner page confirming commissions on referred license sales",
      "data/affiliate/active-partners.ts"
    ],
    ownerBlocker: null,
    formBlocker: null,
    eligibility: "Accepted Wrike referral partner; referral link issued and authorized for sharing",
    applicationUrl: "https://www.wrike.com/partners/referral/",
    notes: "Active relationship verified from the issued PartnerStack referral URL. Do not invent an exact payout percentage until the live offer terms disclose one."
  }},
'''
text = text.replace(anchor, record + anchor, 1)
p.write_text(text)

# Research registry: preserve exact known facts, leave undisclosed terms unknown.
p = Path("data/revenue/affiliate-programs.ts")
text = p.read_text()
if 'slug: "wrike"' in text:
    raise SystemExit("Wrike already exists in affiliate research registry")
anchor = '''];

export function getAffiliateProgram'''
if anchor not in text:
    raise SystemExit("affiliate program list closing anchor missing")
record = f'''  {{
    slug: "wrike",
    lastVerifiedAt: "2026-08-25",
    programExists: "yes",
    type: "network",
    networkName: "PartnerStack",
    countryRestrictions: null,
    commissionModel: "Wrike states referral partners receive a percentage of licenses sold; the acceptance email says rewards are earned when a referral becomes a qualified opportunity. No exact rate was disclosed in the available first-party evidence.",
    recurrence: "unknown",
    notes:
      "ACTIVE 2026-08-25: first-party PartnerStack welcome email confirms Miloosh joined the Wrike Referral Program and issued the live personal referral URL https://get.wrike.com/wdgn8ok7i5ij. Wrike's current first-party referral page confirms the referral program and commission on referred license sales. Exact percentage, cookie window, payout threshold, and payout method remain unrecorded rather than guessed.",
    sourceUrls: ["https://www.wrike.com/partners/referral/"],
    applicationUrl: "https://www.wrike.com/partners/referral/",
    confidence: "high",
  }},
'''
text = text.replace(anchor, record + anchor, 1)
p.write_text(text)

# Regression test: this keeps the live relationship and exact issued link from silently regressing.
p = Path("tests/lib/wrike-affiliate-activation.test.ts")
if p.exists():
    raise SystemExit("Wrike activation test already exists")
p.write_text('''import { describe, expect, it } from "vitest";\nimport { getActivePartner } from "@/data/affiliate/active-partners";\nimport { CURRENT_AFFILIATE_LEDGER } from "@/data/affiliate/current-affiliate-truth";\nimport { getAffiliateProgram } from "@/data/revenue/affiliate-programs";\n\ndescribe("Wrike affiliate activation", () => {\n  it("keeps Wrike active on the exact issued PartnerStack referral URL", () => {\n    const partner = getActivePartner("wrike");\n    expect(partner?.status).toBe("active");\n    expect(partner?.affiliateUrl).toBe("https://get.wrike.com/wdgn8ok7i5ij");\n    expect(partner?.blocker).toBeNull();\n  });\n\n  it("keeps the canonical relationship active without inventing undisclosed terms", () => {\n    const relationship = CURRENT_AFFILIATE_LEDGER.find((entry) => entry.programId === "wrike");\n    expect(relationship?.status).toBe("ACTIVE");\n    expect(relationship?.affiliateUrl).toBe("https://get.wrike.com/wdgn8ok7i5ij");\n    expect(relationship?.network).toBe("PartnerStack");\n    expect(relationship?.cookieWindow).toBeNull();\n  });\n\n  it("records the first-party program evidence as high confidence", () => {\n    const program = getAffiliateProgram("wrike");\n    expect(program?.programExists).toBe("yes");\n    expect(program?.networkName).toBe("PartnerStack");\n    expect(program?.confidence).toBe("high");\n    expect(program?.cookieDuration).toBeUndefined();\n  });\n});\n''')

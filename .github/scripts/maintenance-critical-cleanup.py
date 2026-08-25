from pathlib import Path
import json


def replace_affiliate_entry(text: str, slug: str, replacement: str) -> str:
    start_marker = f'  {{\n    slug: "{slug}",'
    start = text.find(start_marker)
    if start < 0:
        raise SystemExit(f"Could not find affiliate entry for {slug}")
    end = text.find("\n  },", start)
    if end < 0:
        raise SystemExit(f"Could not find end of affiliate entry for {slug}")
    end += len("\n  },")
    return text[:start] + replacement.rstrip() + text[end:]


p = Path("data/revenue/affiliate-programs.ts")
text = p.read_text()

text = replace_affiliate_entry(text, "framer", '''  {
    slug: "framer",
    lastVerifiedAt: "2026-08-25",
    programExists: "yes",
    type: "network",
    networkName: "Dub",
    countryRestrictions: null,
    commissionModel: "50% of subscription payments for the first 12 months for each qualifying referred subscription",
    recurrence: "recurring",
    notes:
      "Re-verified 2026-08-25 against Framer's current first-party Affiliate Conditions and Help Center. The legal terms confirm a 90-day cookie, 50% of subscription payments for the first 12 months, monthly payouts covering promotions redeemed two months earlier, a $200 payout threshold, and Stripe payouts. Framer's current Help Center says affiliate links are now part of the Creator Program and are powered by Dub; manual applications are available through the Links tab in a Framer Community profile, and paid advertising using affiliate links is prohibited.",
    sourceUrls: [
      "https://www.framer.com/legal/affiliates/1.0",
      "https://www.framer.com/help/articles/how-affiliate-links-work/",
      "https://www.framer.com/help/articles/how-the-creator-program-works/",
    ],
    cookieDuration: "90 days",
    payoutThreshold: "$200",
    payoutMethod: "Stripe via Dub",
    confidence: "high",
  },''')

text = replace_affiliate_entry(text, "harvest", '''  {
    slug: "harvest",
    lastVerifiedAt: "2026-08-25",
    programExists: "no",
    type: "unknown",
    networkName: null,
    countryRestrictions: null,
    commissionModel: null,
    recurrence: "unknown",
    notes:
      "Re-verified 2026-08-25 from Harvest's current first-party referral terms and Help Center. Harvest has a customer referral-credit program, not a cash publisher affiliate program: when a referred user converts to a paying plan, both parties receive account credit. Harvest's terms explicitly state credits are non-transferable and cannot be redeemed for cash. This is not a monetizable affiliate program for Miloosh.",
    sourceUrls: [
      "https://www.getharvest.com/referral-program-tos",
      "https://support.getharvest.com/hc/en-us/articles/360048685751-How-do-Harvest-referrals-work",
    ],
    applicationUrl: null,
    confidence: "high",
  },''')

text = replace_affiliate_entry(text, "time-doctor", '''  {
    slug: "time-doctor",
    lastVerifiedAt: "2026-08-25",
    programExists: "yes",
    type: "network",
    networkName: "PartnerStack",
    countryRestrictions: null,
    commissionModel: "Recurring commission for up to three years: 30% in year 1, 15% in year 2, and 10% in year 3",
    recurrence: "recurring",
    notes:
      "CORRECTED 2026-08-25 from Time Doctor's current first-party Partner and Affiliate Partner pages. The prior 2026-08-20 conclusion that no affiliate program existed was based on three obsolete 404 paths. Time Doctor now publishes a live PartnerStack-managed affiliate program for content creators and publishers, with a 90-day last-click window, monthly payouts after the referred customer pays, and no minimum payout threshold. Material eligibility guardrail: the official FAQ explicitly excludes coupon/discount sites, software aggregators, and generic comparison directories, while allowing original-content publishers with an engaged HR/operations/IT/business audience. Because Miloosh is a software-comparison publication, do not apply or activate this program without direct eligibility confirmation from Time Doctor.",
    sourceUrls: [
      "https://www.timedoctor.com/partner",
      "https://www.timedoctor.com/partner/affiliate",
    ],
    applicationUrl: "https://www.timedoctor.com/partner/affiliate",
    cookieDuration: "90 days (last-click)",
    payoutThreshold: "No minimum payout threshold",
    payoutMethod: "PartnerStack",
    eligibility: "Original-content creators and publishers with an engaged HR, operations, IT, or business audience. Coupon/discount sites, software aggregators, and generic comparison directories are explicitly ineligible; Miloosh requires direct eligibility confirmation before applying.",
    confidence: "high",
  },''')

p.write_text(text)

p = Path("data/software/keeper.json")
keeper = json.loads(p.read_text())
old = "https://www.keepersecurity.com/pricing/"
personal = "https://www.keepersecurity.com/pricing/personal-and-family.html"
business = "https://www.keepersecurity.com/pricing/business-and-enterprise.html"
if keeper.get("pricing", {}).get("official_source") != old:
    raise SystemExit("Keeper pricing source no longer matches expected stale URL")
keeper["pricing"]["official_source"] = personal
sources = keeper.get("sources", [])
if old not in sources:
    raise SystemExit("Keeper stale source URL not found")
rebuilt = []
for url in sources:
    if url == old:
        rebuilt.extend([personal, business])
    else:
        rebuilt.append(url)
keeper["sources"] = list(dict.fromkeys(rebuilt))
keeper["accessed_at"] = "2026-08-25"
p.write_text(json.dumps(keeper, indent=2, ensure_ascii=False) + "\n")

p = Path("scripts/maintenance/social-channel-health.ts")
text = p.read_text()
old = 'const NOT_LOCALLY_VERIFIABLE: Channel[] = ["linkedin"];'
new = 'const NOT_LOCALLY_VERIFIABLE: Channel[] = ["linkedin"];\nconst IS_GITHUB_ACTIONS = process.env.GITHUB_ACTIONS === "true";'
if old not in text:
    raise SystemExit("social health constant anchor missing")
text = text.replace(old, new, 1)
old = '''    if (NOT_LOCALLY_VERIFIABLE.includes(channel)) {
      skipped++;
      continue;
    }
    checked++;
    const adapter = ADAPTERS[channel];
    if (adapter.isConfigured()) continue;'''
new = '''    const adapter = ADAPTERS[channel];
    if (NOT_LOCALLY_VERIFIABLE.includes(channel)) {
      skipped++;
      continue;
    }
    // Scheduled GitHub maintenance intentionally lacks Vercel production secrets.
    // Missing env in that runner is therefore not evidence that production is broken.
    if (IS_GITHUB_ACTIONS && !adapter.isConfigured()) {
      skipped++;
      continue;
    }
    checked++;
    if (adapter.isConfigured()) continue;'''
if old not in text:
    raise SystemExit("social health loop anchor missing")
text = text.replace(old, new, 1)
text = text.replace(
    'summary: `Checked ${checked} enabled channel(s) (${skipped} skipped — not locally verifiable, see module header).',
    'summary: `Checked ${checked} enabled channel(s) (${skipped} skipped — not verifiable in this runtime, see module header).',
    1,
)
p.write_text(text)

# Update the regression test to encode the same runtime distinction. In GitHub Actions,
# absent Vercel secrets are intentionally unverifiable and must not be flagged. In a
# runtime that can actually resolve adapters, the strict broken-channel assertion remains.
p = Path("tests/lib/social-channel-health.test.ts")
text = p.read_text()
old = '''  it("flags any enabled, locally-verifiable channel whose adapter reports itself unconfigured", async () => {
    const strategy = getSocialStrategy();
    const report = await executeSocialChannelHealthAgent();
    const flaggedChannels = new Set(report.issues.map((i) => i.location));

    for (const [channel, enabled] of Object.entries(strategy.enabledChannels) as [Channel, boolean][]) {
      if (!enabled || channel === "linkedin") continue;
      const isConfigured = ADAPTERS[channel].isConfigured();
      expect(flaggedChannels.has(channel)).toBe(!isConfigured);
    }
  });'''
new = '''  it("flags broken enabled channels only when their configuration is verifiable in this runtime", async () => {
    const strategy = getSocialStrategy();
    const report = await executeSocialChannelHealthAgent();
    const flaggedChannels = new Set(report.issues.map((i) => i.location));
    const isGitHubActions = process.env.GITHUB_ACTIONS === "true";

    for (const [channel, enabled] of Object.entries(strategy.enabledChannels) as [Channel, boolean][]) {
      if (!enabled || channel === "linkedin") continue;
      const isConfigured = ADAPTERS[channel].isConfigured();
      if (isGitHubActions && !isConfigured) {
        expect(flaggedChannels.has(channel)).toBe(false);
        continue;
      }
      expect(flaggedChannels.has(channel)).toBe(!isConfigured);
    }
  });'''
if old not in text:
    raise SystemExit("social channel health regression anchor missing")
text = text.replace(old, new, 1)
p.write_text(text)

p = Path(".github/workflows/maintenance.yml")
text = p.read_text()
if "uses: actions/checkout@v4" not in text or "uses: actions/setup-node@v4" not in text:
    raise SystemExit("maintenance action-version anchors missing")
text = text.replace("uses: actions/checkout@v4", "uses: actions/checkout@v7", 1)
text = text.replace("uses: actions/setup-node@v4", "uses: actions/setup-node@v7", 1)
p.write_text(text)

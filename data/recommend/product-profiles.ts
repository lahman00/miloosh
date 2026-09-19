import type { RecommendDomain } from "@/lib/recommend/domains";

/**
 * Recommend Engine Rebuild (2026-08-21) — the domain-eligibility layer.
 *
 * This is the answer to "is this even a plausible choice for this
 * buyer?" (Phase 7 of the rebuild brief), checked BEFORE scoring, not
 * after. Before this file existed, every one of the 247 catalog products
 * was scored against every answer set with no eligibility gate at all —
 * a product could theoretically surface for a domain it has nothing to
 * do with just by scoring non-negatively on generic team-size/budget
 * factors. This file makes that structurally impossible for any domain
 * a buyer explicitly selects: lib/recommend/eligibility.ts only scores a
 * product against a domain if that domain appears in this list for that
 * slug.
 *
 * Every entry here was built from the product's own real, already-
 * verified data/software/*.json category and description/bestFor text —
 * nothing invented. A product not listed here for a given domain is not
 * "confirmed unsuitable," it's simply "not evidenced" — which is exactly
 * why it stays excluded rather than scored on a guess.
 *
 * Deliberately NOT every one of the 247 catalog products: only the ones
 * with real, checkable evidence for one of the 13 domains in
 * lib/recommend/domains.ts. A product entirely absent from this file
 * (e.g. a CMS, an API infra tool, a design tool) is CATALOG_ONLY for
 * Recommend purposes — see scripts/recommend/coverage-report.ts — not a
 * gap to force-fill.
 *
 * No affiliate information of any kind lives in this file or is read by
 * anything that reads it — see tests/lib/recommend-affiliate-neutrality.test.ts.
 *
 * Multi-domain audit (2026-08-21 integrity patch): the original authoring
 * pass grouped products by one domain at a time and never revisited a
 * product for a second domain, so real dual-fit evidence (e.g. Notion's
 * own stored feature list) was missed — the type below was always
 * multi-domain-capable, the data just never used it. Explicitly re-audited
 * against each candidate's real data/software/*.json features/description:
 * hubspot (email_marketing/help_desk considered — its stored features read
 * as sales-email and live-chat, not a documented marketing-campaign or
 * ticketing product, kept crm-only), clickup and slack (each has one
 * "wiki"/"Canvas" doc feature, but framed as subordinate to their core
 * product rather than a genuine knowledge-base buyer destination, kept
 * single-domain), airtable (no task/project language in its stored
 * features at all — a no-code database tool with no matching domain, kept
 * CATALOG_ONLY), freshdesk and intercom (no knowledge-base feature in
 * their stored data, unlike zoho-desk — kept help_desk-only), monday,
 * microsoft-teams, hubstaff, and buffer (no second-domain evidence in
 * their stored data). Only notion and zoho-desk had real, explicit,
 * stored-feature-level evidence for a second domain.
 */

export type ProductProfile = {
  slug: string;
  /** Every domain this product has real evidence for. Most products have exactly one; a few genuinely span two (documented per-entry below where non-obvious). */
  domains: RecommendDomain[];
};

// prettier-ignore
export const PRODUCT_PROFILES: readonly ProductProfile[] = [
  // ---- project_management (category: project-management, 12 products) ----
  { slug: "asana", domains: ["project_management"] },
  { slug: "basecamp", domains: ["project_management"] },
  { slug: "clickup", domains: ["project_management"] },
  { slug: "jira", domains: ["project_management"] },
  { slug: "linear", domains: ["project_management"] },
  { slug: "monday", domains: ["project_management"] },
  { slug: "shortcut", domains: ["project_management"] },
  { slug: "smartsheet", domains: ["project_management"] },
  { slug: "teamwork", domains: ["project_management"] },
  { slug: "trello", domains: ["project_management"] },
  { slug: "wrike", domains: ["project_management"] },
  { slug: "zoho-projects", domains: ["project_management"] },

  // ---- crm (category: crm, 10 products) ----
  { slug: "close", domains: ["crm"] },
  { slug: "copper", domains: ["crm"] },
  { slug: "freshsales", domains: ["crm"] },
  { slug: "gohighlevel", domains: ["crm"] },
  { slug: "hubspot", domains: ["crm"] },
  { slug: "keap", domains: ["crm"] },
  { slug: "nutshell", domains: ["crm"] },
  { slug: "pipedrive", domains: ["crm"] },
  { slug: "salesforce", domains: ["crm"] },
  { slug: "zoho-crm", domains: ["crm"] },

  // ---- knowledge_base (category: knowledge-base, 10 products, +6 found 2026-08-21 in the
  // "documentation" category — archbee/nuclino/slab/slite/document360/scribe describe themselves as
  // wiki/knowledge-base/team-knowledge tools in their own stored data, the same real buyer job as this
  // domain's original 10, just mis-sorted into "documentation" by catalog category alone. Docs tools
  // whose real evidence is instead "publish docs for external developers/users" moved to the new
  // developer_documentation domain below, not here. ----
  { slug: "bloomfire", domains: ["knowledge_base"] },
  { slug: "confluence", domains: ["knowledge_base"] },
  { slug: "gitbook", domains: ["knowledge_base"] },
  { slug: "guru", domains: ["knowledge_base"] },
  { slug: "helpjuice", domains: ["knowledge_base"] },
  { slug: "knowledgeowl", domains: ["knowledge_base"] },
  { slug: "obsidian", domains: ["knowledge_base"] },
  { slug: "stack-overflow-for-teams", domains: ["knowledge_base"] },
  { slug: "tettra", domains: ["knowledge_base"] },
  { slug: "trainual", domains: ["knowledge_base"] },
  { slug: "archbee", domains: ["knowledge_base"] }, // "The First Knowledge Portal Platform"
  { slug: "nuclino", domains: ["knowledge_base"] }, // "unifies team knowledge, documentation..."
  { slug: "slab", domains: ["knowledge_base"] }, // "knowledge management platform (wiki)"
  { slug: "slite", domains: ["knowledge_base"] }, // "AI-powered knowledge base"
  { slug: "document360", domains: ["knowledge_base"] }, // "knowledge base platform... internal and external documentation"
  { slug: "scribe", domains: ["knowledge_base"] }, // auto-captures workflows into step-by-step docs, same job as trainual

  // ---- notion (category: productivity — genuine multi-domain: its own data/software/notion.json
  // lists "Wiki and knowledge base pages" AND "Project and task tracking" as two coequal, top-level
  // features, not one subordinate to the other, and the description itself names both as core
  // ("documents, databases, project tracking, and team knowledge in one flexible workspace"). Real
  // buyers genuinely begin in either domain and land on Notion. Found during the 2026-08-21 integrity
  // patch's multi-domain audit — was CATALOG_ONLY before, missed in the original single-pass authoring
  // that grouped products by one domain at a time and never revisited any product for a second. ----
  { slug: "notion", domains: ["knowledge_base", "project_management"] },

  // ---- automation (category: automation, 10 products) ----
  { slug: "ifttt", domains: ["automation"] },
  { slug: "make", domains: ["automation"] },
  { slug: "n8n", domains: ["automation"] },
  { slug: "pipedream", domains: ["automation"] },
  { slug: "power-automate", domains: ["automation"] },
  { slug: "tray-ai", domains: ["automation"] },
  { slug: "uipath", domains: ["automation"] },
  { slug: "workato", domains: ["automation"] },
  { slug: "zapier", domains: ["automation"] },
  { slug: "zoho-flow", domains: ["automation"] },

  // ---- communication / video_meetings / cloud_phone (category: communication, 15 products,
  // restructured 2026-08-21: "communication" alone was exactly the too-broad bucket the brief warned
  // about, mixing team chat, video meetings, and business phone systems -- three real, different buyer
  // decisions. Split using each product's own stored feature bullets, not guesses: a product only gets
  // video_meetings when its own data explicitly names video/meetings as a real capability (not just
  // "Huddles" as one minor feature among many), and only gets cloud_phone when it explicitly names VoIP/
  // business-phone calling. Several unified-communications platforms (Zoom, Webex, Dialpad, RingCentral,
  // Nextiva, Microsoft Teams) genuinely and explicitly span all three -- that's real evidence-backed
  // multi-domain membership, not five-domains-because-many-features forcing. ----
  { slug: "discord", domains: ["communication"] }, // text channels + voice rooms -- community/gaming chat, not a business video-meeting product
  { slug: "google-chat", domains: ["communication"] },
  { slug: "mattermost", domains: ["communication"] }, // "team messaging platform"; Calls is one feature among several, not its core identity
  { slug: "signal", domains: ["communication"] }, // personal encrypted messaging, not a business video/phone product
  { slug: "slack", domains: ["communication"] }, // Huddles is one feature among several, not Slack's core identity
  { slug: "telegram", domains: ["communication"] },
  { slug: "rocket-chat", domains: ["communication", "video_meetings"] }, // own description: "unifies messaging, voice, video" as coequal pillars
  { slug: "google-meet", domains: ["video_meetings"] }, // pure video conferencing, no chat/phone feature bullets
  { slug: "krispcall", domains: ["cloud_phone"] }, // pure cloud business phone system, no team-chat/video feature bullets
  { slug: "webex", domains: ["communication", "video_meetings", "cloud_phone"] }, // own description: "video meetings, webinars, calling, and messaging"
  { slug: "dialpad", domains: ["communication", "video_meetings", "cloud_phone"] }, // own description: "VoIP calling, video meetings, team messaging"
  { slug: "ringcentral", domains: ["communication", "video_meetings", "cloud_phone"] }, // protected-cohort product — referenced here, page content untouched. Own description: "business phone, team messaging, video meetings"
  { slug: "nextiva", domains: ["communication", "video_meetings", "cloud_phone"] }, // own description: "voice calling, video conferencing, team chat"
  { slug: "zoom", domains: ["communication", "video_meetings", "cloud_phone"] }, // own features list explicitly: "Video meetings", "Zoom Chat team messaging", "Zoom Phone cloud VoIP calling"
  { slug: "microsoft-teams", domains: ["communication", "video_meetings", "cloud_phone"] }, // own features list explicitly: "Chat and channels", "AI-powered meetings", "Teams Phone cloud calling"

  // ---- help_desk (category: customer-support, 13 products — all genuinely ticketing/shared-inbox/live-chat tools) ----
  { slug: "crisp", domains: ["help_desk"] },
  { slug: "freshdesk", domains: ["help_desk"] }, // protected-cohort product — referenced here, page content untouched
  { slug: "front", domains: ["help_desk"] }, // protected-cohort product — referenced here, page content untouched
  { slug: "gorgias", domains: ["help_desk"] },
  { slug: "happyfox", domains: ["help_desk"] },
  { slug: "help-scout", domains: ["help_desk"] }, // protected-cohort product — referenced here, page content untouched
  { slug: "intercom", domains: ["help_desk"] }, // protected-cohort product — referenced here, page content untouched
  { slug: "kayako", domains: ["help_desk"] },
  { slug: "liveagent", domains: ["help_desk"] },
  { slug: "reamaze", domains: ["help_desk"] },
  { slug: "tidio", domains: ["help_desk"] },
  { slug: "zendesk", domains: ["help_desk"] },
  // Genuine multi-domain: data/software/zoho-desk.json explicitly lists "24/7 branded self-service
  // help center with knowledge base and community" as its own feature — unlike freshdesk/intercom,
  // which were also audited in the 2026-08-21 integrity patch and kept help_desk-only because their
  // stored feature lists document no comparable knowledge-base capability.
  { slug: "zoho-desk", domains: ["help_desk", "knowledge_base"] },

  // ---- password_manager (from category: security — the security category also holds SSO/IAM/cloud-security/DevSecOps tools that are NOT password managers, deliberately excluded: auth0, cloudflare, crowdstrike, duo-security, okta, snyk, tailscale, wiz) ----
  { slug: "1password", domains: ["password_manager"] },
  { slug: "bitwarden", domains: ["password_manager"] },
  { slug: "dashlane", domains: ["password_manager"] },
  { slug: "keeper-security", domains: ["password_manager"] },
  { slug: "keeper", domains: ["password_manager"] },
  { slug: "lastpass", domains: ["password_manager"] },
  { slug: "nordpass", domains: ["password_manager"] },

  // ---- email_marketing (from category: marketing — excludes SEO tools (ahrefs, moz, semrush), call/lead-attribution tools (callrail, whatconverts, ruler-analytics), social media tools (buffer, hootsuite, later, sprout-social — their own domain below), and enterprise CDP/engagement platforms whose primary evidence is broader than email (braze, marketo-engage)) ----
  { slug: "activecampaign", domains: ["email_marketing"] },
  { slug: "brevo", domains: ["email_marketing"] },
  { slug: "constant-contact", domains: ["email_marketing"] },
  { slug: "getresponse", domains: ["email_marketing"] },
  { slug: "klaviyo", domains: ["email_marketing"] },
  { slug: "mailchimp", domains: ["email_marketing"] },
  { slug: "moosend", domains: ["email_marketing"] },

  // ---- accounting (category: accounting, 5 products) ----
  { slug: "freshbooks", domains: ["accounting"] },
  { slug: "quickbooks-online", domains: ["accounting"] },
  { slug: "wave", domains: ["accounting"] },
  { slug: "xero", domains: ["accounting"] },
  { slug: "zoho-books", domains: ["accounting"] },

  // ---- scheduling (category: scheduling, 10 products) ----
  { slug: "acuity-scheduling", domains: ["scheduling"] },
  { slug: "cal-com", domains: ["scheduling"] },
  { slug: "calendly", domains: ["scheduling"] },
  { slug: "doodle", domains: ["scheduling"] },
  { slug: "microsoft-bookings", domains: ["scheduling"] },
  { slug: "motion", domains: ["scheduling"] },
  { slug: "reclaim-ai", domains: ["scheduling"] },
  { slug: "savvycal", domains: ["scheduling"] },
  { slug: "setmore", domains: ["scheduling"] },
  { slug: "youcanbookme", domains: ["scheduling"] },

  // ---- analytics (from category: analytics — excludes volza, which is trade/customs shipment intelligence, not web/product analytics, despite sharing the category tag) ----
  { slug: "adobe-analytics", domains: ["analytics"] },
  { slug: "amplitude", domains: ["analytics"] },
  { slug: "crazy-egg", domains: ["analytics"] },
  { slug: "fathom-analytics", domains: ["analytics"] },
  { slug: "fullstory", domains: ["analytics"] },
  { slug: "google-analytics", domains: ["analytics"] },
  { slug: "heap", domains: ["analytics"] },
  { slug: "hotjar", domains: ["analytics"] },
  { slug: "matomo", domains: ["analytics"] },
  { slug: "mixpanel", domains: ["analytics"] },
  { slug: "plausible", domains: ["analytics"] },
  { slug: "posthog", domains: ["analytics"] },
  { slug: "segment", domains: ["analytics"] },

  // ---- social_media (from category: marketing — the 4 real social-media-management tools in that category) ----
  { slug: "buffer", domains: ["social_media"] }, // protected-cohort product — referenced here, page content untouched
  { slug: "hootsuite", domains: ["social_media"] },
  { slug: "later", domains: ["social_media"] },
  { slug: "sprout-social", domains: ["social_media"] },

  // ---- time_tracking (from category: productivity — the 5 real time-tracking tools in that category; excludes the note-taking/task-management products also filed under productivity: airtable, anydo, coda, craft, evernote, microsoft-onenote, notion, superhuman, things, ticktick, todoist) ----
  { slug: "clockify", domains: ["time_tracking"] },
  { slug: "harvest", domains: ["time_tracking"] },
  { slug: "hubstaff", domains: ["time_tracking"] },
  { slug: "time-doctor", domains: ["time_tracking"] },
  { slug: "toggl-track", domains: ["time_tracking"] },

  // ==========================================================================
  // Flippa Activation + Recommend Expansion Super-Mission (2026-08-21) —
  // domains added after auditing every CATALOG_ONLY product
  // (scripts/recommend/catalog-only-report.ts) against the acceptance gate:
  // >=3 genuinely credible products, coherent buyer job, real differentiation,
  // enough evidence to score, truthful explanation, not just a broad category
  // bucket. Rejected candidates (documented, not silently dropped): AI voice
  // (elevenlabs + murf-ai = 2; synthesia is a full AI-video-with-avatars
  // product, a different buyer job, not included just to reach 3),
  // observability (datadog + sentry = 2), CI/CD (circleci + jenkins = 2),
  // payments API (adyen + stripe = 2; plaid is financial-data-aggregation,
  // a different job, not payment processing), search API (algolia +
  // elastic = 2), no-code database (airtable alone, no peer), design tools
  // (11 products but 3+ genuinely different buyer jobs each below the
  // threshold once split — deferred, not in this mission's scope), and
  // business marketplaces (zero real catalog products — see the Flippa
  // editorial-gate decision in data/affiliate/canonical-ledger.ts; adding
  // this domain would mean either an empty domain or fabricating
  // marketplace product records neither researched nor catalogued, both
  // prohibited).
  // ==========================================================================

  // ---- property_management (category: property-management, 4 products) ----
  { slug: "appfolio", domains: ["property_management"] },
  { slug: "buildium", domains: ["property_management"] },
  { slug: "doorloop", domains: ["property_management"] },
  { slug: "tenantcloud", domains: ["property_management"] },

  // ---- field_service (category: field-service-management, 3 products) ----
  { slug: "jobber", domains: ["field_service"] },
  { slug: "housecall-pro", domains: ["field_service"] },
  { slug: "servicetitan", domains: ["field_service"] },

  // ---- ecommerce_platform (from category: ecommerce — real online-store platforms; weebly moved to
  // website_builder below since its own data frames it primarily as a site builder with commerce
  // bolted on, not a dedicated commerce platform) ----
  { slug: "shopify", domains: ["ecommerce_platform"] },
  { slug: "woocommerce", domains: ["ecommerce_platform"] },
  { slug: "bigcommerce", domains: ["ecommerce_platform"] },
  { slug: "adobe-commerce", domains: ["ecommerce_platform"] },
  { slug: "shift4shop", domains: ["ecommerce_platform"] },
  { slug: "prestashop", domains: ["ecommerce_platform"] },
  { slug: "opencart", domains: ["ecommerce_platform"] },
  { slug: "ecwid", domains: ["ecommerce_platform"] },
  { slug: "shopware", domains: ["ecommerce_platform"] },
  { slug: "salesforce-commerce-cloud", domains: ["ecommerce_platform"] },

  // ---- website_builder (from category: cms — the 4 products whose own stored description explicitly
  // calls itself a "website builder" with hosting included, distinct from a CMS a developer or content
  // team runs) ----
  // Wix Stores commerce eligibility, verified 2026-09-19:
  // https://www.wix.com/ecommerce/website (eligibility only, not a ranking boost).
  { slug: "wix", domains: ["website_builder", "ecommerce_platform"] },
  { slug: "squarespace", domains: ["website_builder"] },
  { slug: "webflow", domains: ["website_builder"] },
  { slug: "weebly", domains: ["website_builder"] },

  // ---- cms (from category: cms — traditional/monolithic CMS platforms a non-developer can run
  // out of the box, split from headless_cms below: different buyer, different job) ----
  { slug: "wordpress", domains: ["cms"] },
  { slug: "drupal", domains: ["cms"] },
  { slug: "joomla", domains: ["cms"] },
  { slug: "ghost", domains: ["cms"] },
  { slug: "umbraco", domains: ["cms"] },
  { slug: "craft-cms", domains: ["cms"] },

  // ---- headless_cms (from category: cms — API-first content backends a developer connects to their
  // own custom frontend; a genuinely different buyer than the traditional-CMS group above) ----
  { slug: "contentful", domains: ["headless_cms"] },
  { slug: "strapi", domains: ["headless_cms"] },
  { slug: "sanity", domains: ["headless_cms"] },
  { slug: "storyblok", domains: ["headless_cms"] },
  { slug: "directus", domains: ["headless_cms"] },

  // ---- developer_documentation (from category: documentation — publishing docs for external
  // developers/users/API consumers, not an internal team wiki; see knowledge_base above for the 6
  // documentation-category products whose real job is internal team knowledge instead) ----
  { slug: "docusaurus", domains: ["developer_documentation"] },
  { slug: "mkdocs", domains: ["developer_documentation"] },
  { slug: "readme", domains: ["developer_documentation"] },
  { slug: "swaggerhub", domains: ["developer_documentation"] },
  { slug: "read-the-docs", domains: ["developer_documentation"] },
  { slug: "zeroheight", domains: ["developer_documentation"] }, // design-system documentation, structurally a docs site not a wiki

  // ---- api_management (from category: api — API gateway/lifecycle-management platforms; excludes
  // payments (adyen/stripe/plaid), search (algolia/elastic), email/SMS APIs (postmark/sendgrid/twilio),
  // and enterprise auth (workos) — each a different, and individually too-small, buyer job) ----
  { slug: "apigee", domains: ["api_management"] },
  { slug: "kong", domains: ["api_management"] },
  { slug: "mulesoft", domains: ["api_management"] },
  { slug: "rapidapi", domains: ["api_management"] },

  // ---- deployment_hosting (from category: developer-tools — "where does my app/site actually run" ----
  { slug: "netlify", domains: ["deployment_hosting"] },
  { slug: "render", domains: ["deployment_hosting"] },
  { slug: "vercel", domains: ["deployment_hosting"] },
  { slug: "firebase", domains: ["deployment_hosting"] },
  { slug: "supabase", domains: ["deployment_hosting"] },

  // ---- source_control (from category: developer-tools — "where does my team's code live and get
  // reviewed"; excludes circleci/jenkins (CI/CD, only 2 products, below threshold), datadog/sentry
  // (observability, only 2), docker (containerization, no peer), postman (API testing, no peer)) ----
  { slug: "github", domains: ["source_control"] },
  { slug: "bitbucket", domains: ["source_control"] },
  { slug: "gitlab", domains: ["source_control"] },

  // ---- seo_platform (from category: marketing — SEO research/rank-tracking tools) ----
  { slug: "semrush", domains: ["seo_platform"] }, // protected-cohort product — referenced here, page content untouched
  { slug: "ahrefs", domains: ["seo_platform"] },
  { slug: "moz", domains: ["seo_platform"] },

  // ---- call_tracking (from category: marketing — marketing-attribution/call-tracking tools; excludes
  // marketo-engage/braze (marketing automation/CDP, a different job, only 2 products anyway)) ----
  { slug: "callrail", domains: ["call_tracking"] },
  { slug: "ruler-analytics", domains: ["call_tracking"] },
  { slug: "whatconverts", domains: ["call_tracking"] },

  // ---- ui_ux_design (from category: design, 2026-08-22 — interface design/prototyping/dev-handoff
  // tools; excludes canva (general graphic/marketing design, different job) and affinity (photo/
  // illustration/publishing suite, different job) and miro/lucidchart (diagramming/whiteboarding,
  // different job) — each product's own stored description explicitly names design/prototyping/
  // handoff as its core job, verified against data/software/*.json, not inferred from category alone.
  // framer also spans website_builder (its stored description explicitly says "publish production
  // websites" alongside design) — real second-domain evidence, not guessed. ----
  { slug: "figma", domains: ["ui_ux_design"] },
  { slug: "sketch", domains: ["ui_ux_design"] },
  { slug: "framer", domains: ["ui_ux_design", "website_builder"] },
  { slug: "marvel", domains: ["ui_ux_design"] },
  { slug: "balsamiq", domains: ["ui_ux_design"] },
  { slug: "whimsical", domains: ["ui_ux_design"] },
  { slug: "zeplin", domains: ["ui_ux_design"] },

  // ---- task_management (from category: productivity, 2026-08-22 — personal to-do/task apps;
  // excludes coda/airtable (flexible database/workspace tools, different job), superhuman (email
  // client, no peer) — each of the 4 below is explicitly a personal task/to-do manager in its own
  // stored description, not a team project-management tool (kept distinct from project_management,
  // whose 12 products are explicitly team/board/timeline tools). ----
  { slug: "todoist", domains: ["task_management"] },
  { slug: "things", domains: ["task_management"] },
  { slug: "ticktick", domains: ["task_management"] },
  { slug: "anydo", domains: ["task_management"] },

  // ---- note_taking (from category: productivity, 2026-08-22 — note-capture/organization apps,
  // distinct from knowledge_base (team-facing wiki/documentation hub) since these are personal
  // note apps by their own stored description. ----
  { slug: "evernote", domains: ["note_taking"] },
  { slug: "microsoft-onenote", domains: ["note_taking"] },
  { slug: "craft", domains: ["note_taking"] },

  // ---- identity_management (from category: security, 2026-08-22 — identity/SSO/MFA platforms;
  // excludes cloudflare (CDN/network security, different job), crowdstrike/wiz (endpoint/cloud
  // security posture, different job from each other too), snyk (code security scanning, no peer),
  // tailscale (zero-trust network mesh, no peer). Note: auth0's own stored description identifies
  // it as "an Okta product" — kept as a separate entry since the two are marketed and positioned
  // as distinct products for different buyers (developer-first API vs. enterprise admin console),
  // not a duplicate listing. ----
  { slug: "auth0", domains: ["identity_management"] },
  { slug: "okta", domains: ["identity_management"] },
  { slug: "duo-security", domains: ["identity_management"] },
];

const PROFILE_BY_SLUG = new Map(PRODUCT_PROFILES.map((p) => [p.slug, p]));

export function getProductProfile(slug: string): ProductProfile | undefined {
  return PROFILE_BY_SLUG.get(slug);
}

export function isEligibleForDomain(slug: string, domain: RecommendDomain): boolean {
  return getProductProfile(slug)?.domains.includes(domain) ?? false;
}

export function getSlugsForDomain(domain: RecommendDomain): string[] {
  return PRODUCT_PROFILES.filter((p) => p.domains.includes(domain)).map((p) => p.slug);
}

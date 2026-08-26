/**
 * Recommend Engine Rebuild (2026-08-21) — the decision-domain model.
 *
 * Before this, "what does the tool need to cover?" was 5 hardcoded
 * booleans (needsProjectManagement, needsCrm, needsKnowledgeBase,
 * needsAutomation, needsCommunication) scattered across
 * lib/recommend/types.ts, keywords.ts, scoring.ts, query.ts, and
 * RecommendWizard.tsx — adding a 6th meant touching all five. A buyer
 * looking for a help desk, password manager, email marketing tool,
 * accounting software, scheduler, analytics platform, social media
 * manager, or time tracker had no way to express that need at all: the
 * wizard didn't offer it, so they'd get generic team-size/budget-based
 * results with zero connection to what they actually wanted.
 *
 * This file is the single source of truth for what a "domain" is. Every
 * domain here was added only after checking the real catalog has enough
 * products with a coherent, evidence-backed fit — see the product-profile
 * and supplemental-domain-evidence research notes. A domain is never added
 * merely because data/categories/categories.json has a matching category slug.
 */

export const RECOMMEND_DOMAINS = [
  "project_management",
  "crm",
  "knowledge_base",
  "automation",
  "communication",
  "help_desk",
  "password_manager",
  "email_marketing",
  "accounting",
  "scheduling",
  "analytics",
  "social_media",
  "time_tracking",
  // Flippa Activation + Recommend Expansion Super-Mission (2026-08-21) —
  // Phase 11-13: every domain below was added only after auditing the
  // real CATALOG_ONLY products (scripts/recommend/catalog-only-report.ts)
  // and confirming >=3 genuinely credible, coherent-buyer-job products —
  // see data/recommend/product-profiles.ts's per-domain research notes.
  // Candidates that failed that bar (observability: 2 products, CI/CD: 2,
  // AI voice: 2, payments API: 2, search API: 2, no-code database: 1)
  // were deliberately rejected, not force-fit.
  "property_management",
  "field_service",
  "ecommerce_platform",
  "website_builder",
  "cms",
  "headless_cms",
  "developer_documentation",
  "video_meetings",
  "cloud_phone",
  "api_management",
  "deployment_hosting",
  "source_control",
  "seo_platform",
  "call_tracking",
  // Decontamination + Commercial Growth Mega-Mission (2026-08-22) — fresh
  // audit of scripts/recommend/catalog-only-report.ts's live output (not a
  // stale report). Every domain below cleared the same >=3-genuine-product,
  // coherent-buyer-job bar as the prior expansion — see product-profiles.ts's
  // per-domain research notes for the exact stored-text evidence.
  "ui_ux_design",
  "task_management",
  "note_taking",
  "identity_management",
  // Revenue sprint (2026-08-26): fresh catalog audit found four independently
  // researched products with the same buyer job of collecting structured
  // responses through surveys/forms — SurveyMonkey, Typeform, Jotform and
  // Qualtrics. The domain exists because the editorial evidence clears the
  // established >=3-product bar, not because any one product is monetized.
  "survey_forms",
] as const;

export type RecommendDomain = (typeof RECOMMEND_DOMAINS)[number];

export type DomainMeta = {
  domain: RecommendDomain;
  /** Plain-language label shown in the "what are you trying to do?" step — no SaaS taxonomy jargon. */
  label: string;
  /** One-sentence plain-language description of the need, not the product category name. */
  description: string;
  /** The real catalog category this domain is centered on — informational, never the eligibility source. */
  primaryCategorySlug: string;
};

/**
 * Every domain's plain-language framing. Written for a buyer who doesn't
 * know or care what "CRM" or "knowledge base" means as a category label.
 */
export const DOMAIN_META: Record<RecommendDomain, DomainMeta> = {
  project_management: {
    domain: "project_management",
    label: "Plan and track work",
    description: "Tasks, boards, timelines, and who's doing what by when.",
    primaryCategorySlug: "project-management",
  },
  crm: {
    domain: "crm",
    label: "Track sales leads and deals",
    description: "A pipeline for contacts, deals, and follow-ups so nothing falls through.",
    primaryCategorySlug: "crm",
  },
  knowledge_base: {
    domain: "knowledge_base",
    label: "Store docs your team or customers can search",
    description: "A wiki or documentation hub people can actually find answers in.",
    primaryCategorySlug: "knowledge-base",
  },
  automation: {
    domain: "automation",
    label: "Automate repetitive steps between tools",
    description: "Trigger-based workflows that move data between apps without manual work.",
    primaryCategorySlug: "automation",
  },
  communication: {
    domain: "communication",
    label: "Chat, calls, or video meetings",
    description: "Real-time team or customer communication — messaging, calls, or video.",
    primaryCategorySlug: "communication",
  },
  help_desk: {
    domain: "help_desk",
    label: "Support customers with tickets or live chat",
    description: "A shared inbox or ticketing system so customer questions don't get lost.",
    primaryCategorySlug: "customer-support",
  },
  password_manager: {
    domain: "password_manager",
    label: "Store and share passwords securely",
    description: "A vault for passwords and logins, for yourself or a whole team.",
    primaryCategorySlug: "security",
  },
  email_marketing: {
    domain: "email_marketing",
    label: "Send newsletters or marketing emails",
    description: "Build an email list, send campaigns, and automate follow-ups.",
    primaryCategorySlug: "marketing",
  },
  accounting: {
    domain: "accounting",
    label: "Handle bookkeeping and invoicing",
    description: "Track income and expenses, send invoices, and stay ready for tax time.",
    primaryCategorySlug: "accounting",
  },
  scheduling: {
    domain: "scheduling",
    label: "Let people book time on your calendar",
    description: "A booking link so clients or teammates can schedule time without back-and-forth emails.",
    primaryCategorySlug: "scheduling",
  },
  analytics: {
    domain: "analytics",
    label: "Understand how people use your website or product",
    description: "Track visits, behavior, and conversions on a site or app.",
    primaryCategorySlug: "analytics",
  },
  social_media: {
    domain: "social_media",
    label: "Plan and publish social media posts",
    description: "Schedule posts across platforms and see how they perform, from one place.",
    primaryCategorySlug: "marketing",
  },
  time_tracking: {
    domain: "time_tracking",
    label: "Track time spent on work or projects",
    description: "Log hours for billing, payroll, or understanding where time actually goes.",
    primaryCategorySlug: "productivity",
  },
  property_management: {
    domain: "property_management",
    label: "Manage rental properties",
    description: "Track tenants, rent, maintenance requests, and leases for properties you manage.",
    primaryCategorySlug: "property-management",
  },
  field_service: {
    domain: "field_service",
    label: "Dispatch and schedule field technicians",
    description: "Scheduling, dispatching, and invoicing for teams that do on-site work like repairs or installs.",
    primaryCategorySlug: "field-service-management",
  },
  ecommerce_platform: {
    domain: "ecommerce_platform",
    label: "Build an online store",
    description: "A platform to list products, take payments, and sell online.",
    primaryCategorySlug: "ecommerce",
  },
  website_builder: {
    domain: "website_builder",
    label: "Build a website without coding",
    description: "A drag-and-drop site builder with hosting included.",
    primaryCategorySlug: "cms",
  },
  cms: {
    domain: "cms",
    label: "Manage a website's content",
    description: "Publish and update pages, posts, or content on a website you or your team built.",
    primaryCategorySlug: "cms",
  },
  headless_cms: {
    domain: "headless_cms",
    label: "Manage content that feeds a custom-built site or app",
    description: "A content backend developers connect to their own frontend, not a drag-and-drop builder.",
    primaryCategorySlug: "cms",
  },
  developer_documentation: {
    domain: "developer_documentation",
    label: "Publish docs for your product or API",
    description: "A documentation site for developers or customers to reference, not an internal team wiki.",
    primaryCategorySlug: "documentation",
  },
  video_meetings: {
    domain: "video_meetings",
    label: "Host video meetings or webinars",
    description: "Face-to-face video calls, webinars, and screen sharing.",
    primaryCategorySlug: "communication",
  },
  cloud_phone: {
    domain: "cloud_phone",
    label: "Run business phone calls and SMS",
    description: "A cloud-based phone system for calling and texting customers.",
    primaryCategorySlug: "communication",
  },
  api_management: {
    domain: "api_management",
    label: "Manage and gateway APIs",
    description: "Route, secure, monitor, or monetize APIs across your organization.",
    primaryCategorySlug: "api",
  },
  deployment_hosting: {
    domain: "deployment_hosting",
    label: "Host and deploy an app or website",
    description: "Where your app's code actually runs, deploys, and serves traffic.",
    primaryCategorySlug: "developer-tools",
  },
  source_control: {
    domain: "source_control",
    label: "Host code and manage git repositories",
    description: "Where your team's code lives, reviews happen, and versions are tracked.",
    primaryCategorySlug: "developer-tools",
  },
  seo_platform: {
    domain: "seo_platform",
    label: "Research keywords and track search rankings",
    description: "SEO research, rank tracking, and site-audit tools for organic search.",
    primaryCategorySlug: "marketing",
  },
  call_tracking: {
    domain: "call_tracking",
    label: "Track which marketing drives phone calls",
    description: "Attribute inbound calls to the ad, campaign, or channel that generated them.",
    primaryCategorySlug: "marketing",
  },
  ui_ux_design: {
    domain: "ui_ux_design",
    label: "Design a product interface and hand it to developers",
    description: "Design screens, build clickable prototypes, and produce clean specs for engineers.",
    primaryCategorySlug: "design",
  },
  task_management: {
    domain: "task_management",
    label: "Keep your own to-do list organized",
    description: "A personal task list with projects, reminders, and scheduling — not a team project board.",
    primaryCategorySlug: "productivity",
  },
  note_taking: {
    domain: "note_taking",
    label: "Capture and organize notes",
    description: "Write, structure, and search notes, documents, and things you want to remember.",
    primaryCategorySlug: "productivity",
  },
  identity_management: {
    domain: "identity_management",
    label: "Add login, SSO, or multi-factor authentication",
    description: "Secure how people sign in to your product or your company's internal tools.",
    primaryCategorySlug: "security",
  },
  survey_forms: {
    domain: "survey_forms",
    label: "Collect responses with surveys or forms",
    description: "Build forms or surveys, apply logic, collect responses, and analyze what people submit.",
    primaryCategorySlug: "analytics",
  },
};

export function getDomainMeta(domain: RecommendDomain): DomainMeta {
  return DOMAIN_META[domain];
}

export function isRecommendDomain(value: string): value is RecommendDomain {
  return (RECOMMEND_DOMAINS as readonly string[]).includes(value);
}

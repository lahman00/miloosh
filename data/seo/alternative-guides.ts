export type AlternativeDecision = {
  heading: string;
  fit: string;
  alternativeSlug: string;
  comparisonSlug: string;
};

export type AlternativeGuide = {
  diagnosis: string;
  heading: string;
  introduction: string;
  whySeekAlternative: string[];
  decisions: AlternativeDecision[];
  evidenceSources: string[];
};

export const ALTERNATIVE_GUIDES: Record<string, AlternativeGuide> = {
  pipedrive: {
    diagnosis: "The existing page names only two broad CRM alternatives and does not route sales teams through the pipeline, automation, and suite-depth decisions reflected in Pipedrive's current plans.",
    heading: "Choose a Pipedrive alternative by sales workflow",
    introduction: "Pipedrive centers the sales process on a visual deal pipeline. A different CRM becomes relevant when the buying decision is really about starting cost, wider marketing and service coverage, or a more configurable operating model—not simply replacing one pipeline screen with another.",
    whySeekAlternative: ["A team wants CRM, marketing, and service tools in one product family.", "The sales process needs a different balance of automation, reporting, and customization.", "A smaller team wants to compare the total plan and add-on structure before migrating data."],
    decisions: [
      { heading: "Broader go-to-market suite", fit: "HubSpot is the relevant Miloosh-covered option when the evaluation includes marketing and service tools alongside CRM.", alternativeSlug: "hubspot", comparisonSlug: "hubspot-vs-pipedrive" },
      { heading: "Sales-first CRM with a different operating model", fit: "Freshsales is worth comparing when the requirement remains sales-focused but the team wants another approach to automation and customer context.", alternativeSlug: "freshsales", comparisonSlug: "pipedrive-vs-freshsales" },
      { heading: "Customization across a wider CRM stack", fit: "Zoho CRM is the decision path for teams evaluating a broader suite and a different customization model.", alternativeSlug: "zoho-crm", comparisonSlug: "pipedrive-vs-zoho-crm" },
    ],
    evidenceSources: ["https://www.pipedrive.com/en/pricing", "https://www.pipedrive.com/en/features"],
  },
  airtable: {
    diagnosis: "The page lists three alternatives but does not explain when a buyer needs an app-building database, a document workspace, or a task-first work-management system.",
    heading: "Start with the system you are trying to build",
    introduction: "Airtable combines relational data, interfaces, automations, and app building. The useful alternatives question is therefore structural: does the team need a database-backed application, a document-centered workspace, or a dedicated system for managing project execution?",
    whySeekAlternative: ["The primary work happens in documents and knowledge pages rather than connected records.", "The team needs task ownership and delivery views more than a configurable data layer.", "Seat pricing, scale, permissions, and automation limits change the fit as usage grows."],
    decisions: [
      { heading: "Documents and knowledge with databases", fit: "Notion is the relevant path when pages, wikis, and documentation are as important as structured data.", alternativeSlug: "notion", comparisonSlug: "airtable-vs-notion" },
      { heading: "Task and project execution", fit: "ClickUp fits evaluations centered on assigned work, timelines, and project delivery rather than building an internal app.", alternativeSlug: "clickup", comparisonSlug: "clickup-vs-airtable" },
      { heading: "Visual work management", fit: "Monday.com is a credible comparison when teams want board-led workflows, dashboards, and automations without Airtable's database emphasis.", alternativeSlug: "monday", comparisonSlug: "monday-vs-airtable" },
    ],
    evidenceSources: ["https://airtable.com/pricing", "https://www.airtable.com/platform"],
  },
  semrush: {
    diagnosis: "The page compresses a broad SEO and digital-marketing platform into two alternatives, leaving specialist SEO, first-party analytics, and social workflows undifferentiated.",
    heading: "Decide which part of Semrush you actually need",
    introduction: "Semrush spans SEO research, site auditing, competitive analysis, content, advertising, social, local, and AI-search visibility. Buyers looking for an alternative should first separate an all-in-one marketing suite decision from a specialist SEO-data, web-analytics, or social-management decision.",
    whySeekAlternative: ["The team needs deep SEO research without the wider marketing toolkit.", "The requirement is measurement of owned-site behavior rather than competitor and search research.", "A dedicated social publishing or listening workflow matters more than an SEO-centered suite."],
    decisions: [
      { heading: "Specialist SEO research", fit: "Ahrefs is the closest Miloosh-covered route when backlink, keyword, and organic-search research are the core job.", alternativeSlug: "ahrefs", comparisonSlug: "semrush-vs-ahrefs" },
      { heading: "Owned-site analytics", fit: "Google Analytics addresses traffic and conversion measurement; it is complementary in many stacks, so compare the job rather than assuming feature equivalence.", alternativeSlug: "google-analytics", comparisonSlug: "semrush-vs-google-analytics" },
      { heading: "Social intelligence and management", fit: "Sprout Social is relevant when publishing, engagement, listening, and social analytics are the primary requirement.", alternativeSlug: "sprout-social", comparisonSlug: "semrush-vs-sprout-social" },
    ],
    evidenceSources: ["https://www.semrush.com/pricing/", "https://www.semrush.com/features/"],
  },
  // Organic Traffic Breakthrough Mission (2026-08-21) — the 5 entries below were added after real
  // Google Search Console evidence (scripts run against the production seo-factory's cached GSC-backed
  // run, window 2026-07-21..2026-08-17) showed each of these products' own page ranking position ~70-90
  // for real "X alternatives" queries with real double- and triple-digit impressions and 0% CTR — the
  // exact intent-mismatch pattern this guide mechanism (components/AlternativeDecisionGuide.tsx) already
  // fixes for pipedrive/airtable/semrush/freshdesk/etc above. Every comparisonSlug below was verified
  // against the real comparison graph (data/comparisons.ts's getComparisonsInvolving) before being used
  // — never a guessed or invented route.
  todoist: {
    diagnosis: "The page's generic alternatives list doesn't separate a personal-task-app decision from a broader team-work-management decision, which is what most real 'todoist alternative' searches are actually asking.",
    heading: "Decide how far past personal tasks you need to go",
    introduction: "Todoist is a personal and small-team task manager built around quick capture and natural-language scheduling. The right alternative depends on whether the real need is still personal task tracking, or has grown into team-wide project and work management.",
    whySeekAlternative: ["The team has outgrown personal task lists and needs shared project tracking, dashboards, and automation.", "Tasks need to live alongside documents and a team knowledge base, not in a separate app.", "Built-in focus tools like a Pomodoro timer or habit tracking matter as much as the task list itself."],
    decisions: [
      { heading: "Team project management", fit: "ClickUp is the relevant route once the requirement grows into task hierarchy, dashboards, and automation across a team, not just a personal list.", alternativeSlug: "clickup", comparisonSlug: "clickup-vs-todoist" },
      { heading: "Docs and tasks in one workspace", fit: "Notion fits when tasks need to sit alongside documents, databases, and a team wiki rather than a dedicated task app.", alternativeSlug: "notion", comparisonSlug: "notion-vs-todoist" },
      { heading: "Focus and habit tracking built in", fit: "TickTick is the closer comparison for a personal task app that also includes a Pomodoro timer, habit tracker, and multiple calendar views.", alternativeSlug: "ticktick", comparisonSlug: "todoist-vs-ticktick" },
    ],
    evidenceSources: ["https://todoist.com"],
  },
  setmore: {
    diagnosis: "The page's alternatives list doesn't distinguish Setmore's free branded-booking-page positioning from calendar-sync-first, open-source, or Squarespace-integrated scheduling decisions.",
    heading: "Match the booking model to how you actually work",
    introduction: "Setmore centers on a free, branded booking page with payments and reminders built in. The useful alternatives question is which part of that model matters most: calendar-sync breadth, an open/customizable platform, or integration with an existing Squarespace site.",
    whySeekAlternative: ["Syncing many existing calendars and integrating with video tools like Zoom or Teams matters more than a standalone booking page.", "An open, self-hostable or highly customizable scheduling platform is the real requirement.", "The business already runs on Squarespace and wants scheduling built into that ecosystem."],
    decisions: [
      { heading: "Broadest calendar and video integrations", fit: "Calendly is the relevant comparison when syncing multiple calendars and connecting to tools like Zoom, Teams, or Meet is the priority.", alternativeSlug: "calendly", comparisonSlug: "calendly-vs-setmore" },
      { heading: "Open, customizable scheduling", fit: "Cal.com fits teams that want an open platform with built-in video and payment collection rather than a fixed booking-page product.", alternativeSlug: "cal-com", comparisonSlug: "cal-com-vs-setmore" },
      { heading: "Squarespace-integrated booking", fit: "Acuity Scheduling is the closer route for service businesses already on Squarespace, with custom intake forms and branded pages.", alternativeSlug: "acuity-scheduling", comparisonSlug: "acuity-scheduling-vs-setmore" },
    ],
    evidenceSources: ["https://www.setmore.com"],
  },
  clickup: {
    diagnosis: "The page's alternatives list treats ClickUp as one undifferentiated project-management choice, without routing buyers by whether they want simpler boards, visual no-code workflows, or software-development-specific tracking.",
    heading: "Choose an alternative by how your team actually plans work",
    introduction: "ClickUp combines task hierarchy, docs, dashboards, and automation in one platform. Teams look for an alternative when they want something simpler, more visual, or built specifically around software delivery instead of general work management.",
    whySeekAlternative: ["The team wants simpler boards and cards without ClickUp's full depth of Spaces, Folders, and custom fields.", "Visual, no-code automation and dashboards matter more than task hierarchy depth.", "Work is software development specifically, with sprints, backlogs, and code-linked issues."],
    decisions: [
      { heading: "Simpler Kanban boards", fit: "Trello is the relevant comparison for teams that want straightforward boards, lists, and cards without ClickUp's configuration depth.", alternativeSlug: "trello", comparisonSlug: "clickup-vs-trello" },
      { heading: "Visual, no-code work management", fit: "Monday.com fits buyers who want customizable boards, dashboards, and automations with a more visual, less hierarchical setup.", alternativeSlug: "monday", comparisonSlug: "clickup-vs-monday" },
      { heading: "Software development tracking", fit: "Jira is the closer route once the requirement is specifically sprints, backlogs, and dependency tracking across a dev team.", alternativeSlug: "jira", comparisonSlug: "clickup-vs-jira" },
    ],
    evidenceSources: ["https://clickup.com"],
  },
  "sprout-social": {
    diagnosis: "The page's alternatives list doesn't separate Sprout Social's social-intelligence/listening positioning from simpler scheduling-first or visual-content-calendar decisions many searchers actually want.",
    heading: "Decide between intelligence, simplicity, and visual planning",
    introduction: "Sprout Social centers on real-time social intelligence, listening, and an AI-assisted inbox. The useful alternatives question is whether the real need is that depth of analysis, or a simpler scheduling and visual-planning workflow instead.",
    whySeekAlternative: ["The team wants straightforward scheduling and publishing without a social-intelligence layer.", "Visual content planning for Instagram-first or TikTok-first teams matters more than listening/analytics depth.", "Broader competitor and trend tracking across networks is the priority."],
    decisions: [
      { heading: "Simpler scheduling and publishing", fit: "Buffer is the relevant comparison for teams that want straightforward multi-platform scheduling without Sprout Social's listening and intelligence layer.", alternativeSlug: "buffer", comparisonSlug: "buffer-vs-sprout-social" },
      { heading: "Visual, Instagram-first content calendar", fit: "Later fits teams centered on a visual grid planner and Instagram/TikTok/Pinterest-first publishing.", alternativeSlug: "later", comparisonSlug: "sprout-social-vs-later" },
      { heading: "Broader trend and competitor tracking", fit: "Hootsuite is the closer route when trend tracking, a unified inbox, and competitor performance analysis are the core requirement.", alternativeSlug: "hootsuite", comparisonSlug: "hootsuite-vs-sprout-social" },
    ],
    evidenceSources: ["https://sproutsocial.com"],
  },
  activecampaign: {
    diagnosis: "The page's alternatives list doesn't distinguish ActiveCampaign's AI-driven automation positioning from ecommerce-customer-data, simpler-all-in-one, or widely-used-drag-and-drop-builder decisions.",
    heading: "Match the alternative to your marketing data and workflow",
    introduction: "ActiveCampaign positions itself as an AI-agent-driven marketing platform across email, SMS, and WhatsApp. The useful alternatives question is whether the real requirement is ecommerce customer data, a simpler all-in-one toolkit, or a familiar drag-and-drop email builder.",
    whySeekAlternative: ["The business is ecommerce-first and needs unified customer profiles and omnichannel automation built for that.", "The team wants email, landing pages, and webinars in one simpler product rather than deep automation flows.", "A widely-used, easy drag-and-drop email builder matters more than AI-driven automation depth."],
    decisions: [
      { heading: "Ecommerce customer data platform", fit: "Klaviyo is the relevant comparison for ecommerce-first teams that need unified customer profiles and omnichannel automation.", alternativeSlug: "klaviyo", comparisonSlug: "activecampaign-vs-klaviyo" },
      { heading: "Simpler all-in-one marketing", fit: "GetResponse fits buyers who want email, automation, landing pages, and webinars in one simpler product.", alternativeSlug: "getresponse", comparisonSlug: "getresponse-vs-activecampaign" },
      { heading: "Familiar drag-and-drop email builder", fit: "Mailchimp is the closer route when an easy, widely-known email builder with integrated SMS matters more than deep automation.", alternativeSlug: "mailchimp", comparisonSlug: "activecampaign-vs-mailchimp" },
    ],
    evidenceSources: ["https://www.activecampaign.com"],
  },
  // Growth War Room mission (2026-08-21) — the 5 entries below extend the same
  // real-GSC-evidence pattern to the next tier of non-protected, non-experiment,
  // action=IMPROVE opportunities from the same cached seo-factory data. Every
  // comparisonSlug verified against isPublishedComparison's real stored order
  // before use (the exact bug class caught and fixed in the prior mission).
  salesforce: {
    diagnosis: "The page's alternatives list doesn't separate a simpler sales-only CRM decision from a broader go-to-market-suite decision, which is what most real 'salesforce alternatives' searches are actually asking given Salesforce's own enterprise, multi-cloud scope.",
    heading: "Decide how much of the go-to-market suite you actually need",
    introduction: "Salesforce centralizes sales, service, marketing, and IT on one platform. The useful alternatives question is whether the real requirement is still that full breadth, or has narrowed to a simpler, sales-focused pipeline.",
    whySeekAlternative: ["The team wants a simpler, visual sales pipeline without Salesforce's platform-wide configuration overhead.", "Marketing and service tools alongside CRM matter, but from a smaller, more self-serve platform.", "Built-in calling, email, and SMS in the CRM itself matters more than a broader suite."],
    decisions: [
      { heading: "Simpler visual sales pipeline", fit: "Pipedrive is the relevant comparison for teams that want a focused, visual deal pipeline without Salesforce's platform-wide configuration surface.", alternativeSlug: "pipedrive", comparisonSlug: "salesforce-vs-pipedrive" },
      { heading: "Smaller go-to-market suite", fit: "HubSpot fits buyers who want sales, marketing, and service tools together, but on a more self-serve, less platform-heavy product.", alternativeSlug: "hubspot", comparisonSlug: "hubspot-vs-salesforce" },
      { heading: "Calling-first sales CRM", fit: "Close is the closer route when built-in calling, email, and SMS inside the CRM itself is the core requirement.", alternativeSlug: "close", comparisonSlug: "salesforce-vs-close" },
    ],
    evidenceSources: ["https://www.salesforce.com"],
  },
  smartsheet: {
    diagnosis: "The page names three alternatives but does not separate the spreadsheet-style, governed work-management model from a flexible database, a task-first project system, or another enterprise work-management platform.",
    heading: "Choose the work model before the tool",
    introduction: "Smartsheet combines spreadsheet-style grids, project views, forms, automation, dashboards, and governance. The useful alternatives decision is whether the team needs a flexible database for custom operational apps, a task-first delivery system, or an enterprise work-management platform with a different operating model.",
    whySeekAlternative: [
      "The team needs to model connected records and build custom internal workflows, not primarily manage work in spreadsheet-style sheets.",
      "Assigned tasks, project delivery, and cross-team execution matter more than a grid-first planning model.",
      "The organization still needs enterprise work management, but wants to compare reporting, resource management, and collaboration approaches.",
    ],
    decisions: [
      { heading: "Flexible operational database", fit: "Airtable is the relevant path when the core requirement is connected records, custom interfaces, and configurable internal applications rather than a spreadsheet-style project system.", alternativeSlug: "airtable", comparisonSlug: "airtable-vs-smartsheet" },
      { heading: "Task-first project delivery", fit: "Asana fits teams that want work organized around owned tasks, projects, dependencies, and cross-team delivery rather than grid-led planning.", alternativeSlug: "asana", comparisonSlug: "asana-vs-smartsheet" },
      { heading: "Enterprise work management", fit: "Wrike is the closer comparison for organizations evaluating enterprise project visibility, resource management, and cross-functional work operations.", alternativeSlug: "wrike", comparisonSlug: "smartsheet-vs-wrike" },
    ],
    evidenceSources: ["https://www.smartsheet.com/platform", "https://www.airtable.com/platform"],
  },
  wrike: {
    diagnosis: "The page lists three alternatives but does not explain the distinct choice between a visual workflow platform, a spreadsheet-style governed system, and a task hierarchy with documents and dashboards.",
    heading: "Choose the operating model for complex work",
    introduction: "Wrike is positioned around enterprise work visibility, resource management, request intake, approvals, and cross-functional workflows. The useful alternative decision is whether the team needs highly visual configurable boards, grid-led portfolio control, or a more task-hierarchy-centered work system.",
    whySeekAlternative: [
      "The team wants a visual, configurable workflow platform with board-led views and automation rather than Wrike's enterprise work-management model.",
      "Spreadsheet-style planning, Gantt views, forms, and governed reporting are the primary operating model.",
      "The requirement is a unified task hierarchy with documents and dashboards for project execution.",
    ],
    decisions: [
      { heading: "Visual workflow configuration", fit: "Monday.com is the relevant path when customizable boards, dashboards, and visual workflow automation are the core requirement.", alternativeSlug: "monday", comparisonSlug: "monday-vs-wrike" },
      { heading: "Grid-led portfolio control", fit: "Smartsheet fits teams that want spreadsheet-style planning, forms, Gantt views, and enterprise reporting at the center of work management.", alternativeSlug: "smartsheet", comparisonSlug: "smartsheet-vs-wrike" },
      { heading: "Task hierarchy with docs", fit: "ClickUp is the closer comparison when task structure, documents, dashboards, and flexible project execution are the main decision criteria.", alternativeSlug: "clickup", comparisonSlug: "clickup-vs-wrike" },
    ],
    evidenceSources: ["https://www.wrike.com/features/", "https://monday.com"],
  },
  "zoho-crm": {
    diagnosis: "The page lists three alternatives but does not distinguish a broad suite decision, an enterprise customization decision, and a focused sales-pipeline decision.",
    heading: "Choose the CRM scope before the vendor",
    introduction: "Zoho CRM combines sales workflows, omnichannel engagement, automation, analytics, and AI assistance. The useful alternative decision is whether the team needs a broader go-to-market suite, a deeply customizable enterprise platform, or a focused visual sales pipeline.",
    whySeekAlternative: [
      "Marketing, sales, and service need to operate as one connected go-to-market system, not only inside a CRM.",
      "The organization needs an enterprise CRM platform with extensive customization and a large add-on ecosystem.",
      "The sales team wants a simpler, activity-led pipeline instead of a broader configurable CRM suite.",
    ],
    decisions: [
      { heading: "Broader go-to-market suite", fit: "HubSpot is the relevant path when marketing, sales, and service workflows need to operate together in one platform.", alternativeSlug: "hubspot", comparisonSlug: "hubspot-vs-zoho-crm" },
      { heading: "Enterprise customization", fit: "Salesforce fits organizations evaluating deeper platform customization, scale, and an extensive application ecosystem.", alternativeSlug: "salesforce", comparisonSlug: "salesforce-vs-zoho-crm" },
      { heading: "Focused visual sales pipeline", fit: "Pipedrive is the closer comparison when the primary need is a visual, activity-led sales pipeline with a more focused operating model.", alternativeSlug: "pipedrive", comparisonSlug: "pipedrive-vs-zoho-crm" },
    ],
    evidenceSources: ["https://www.zoho.com/crm/", "https://www.pipedrive.com/en/features"],
  },
  tidio: {
    diagnosis: "The page's alternatives list doesn't separate Tidio's live-chat-plus-AI-agent positioning from deeper omnichannel ticketing, ecommerce-native AI support, or simpler shared-inbox decisions.",
    heading: "Decide what kind of support operation you're running",
    introduction: "Tidio combines live chat, a help desk, and the Lyro AI agent. The useful alternatives question is whether the real need is that live-chat-plus-AI combination, or has grown into deeper ticketing, ecommerce-specific AI, or a simpler shared inbox.",
    whySeekAlternative: ["The team needs deeper omnichannel ticketing with routing and automation across email, chat, phone, and social.", "Support is ecommerce-first and needs AI shopping assistance and native Shopify order context.", "A simpler shared inbox with a knowledge base matters more than a dedicated AI agent."],
    decisions: [
      { heading: "Deeper omnichannel ticketing", fit: "Zendesk is the relevant comparison once the requirement grows into full ticketing, routing, and automation across every channel.", alternativeSlug: "zendesk", comparisonSlug: "tidio-vs-zendesk" },
      { heading: "Ecommerce-native AI support", fit: "Gorgias fits ecommerce teams that want an AI shopping assistant and native Shopify order/customer context built in.", alternativeSlug: "gorgias", comparisonSlug: "gorgias-vs-tidio" },
      { heading: "Simpler shared inbox", fit: "Help Scout is the closer route for a focused shared inbox and knowledge base without a dedicated AI-agent layer.", alternativeSlug: "help-scout", comparisonSlug: "help-scout-vs-tidio" },
    ],
    evidenceSources: ["https://www.tidio.com"],
  },
  lastpass: {
    diagnosis: "The page's alternatives list doesn't distinguish LastPass's zero-knowledge vault positioning from an open-source-transparency decision, an enterprise zero-trust decision, or a team-admin-controls decision.",
    heading: "Decide what matters most: openness, monitoring, or admin control",
    introduction: "LastPass centers on a zero-knowledge encrypted vault with autofill. The useful alternatives question is which property matters most: open-source transparency, built-in breach monitoring, or granular team sharing controls.",
    whySeekAlternative: ["An open-source, independently-auditable codebase matters more than a closed-source vendor product.", "Built-in dark-web breach monitoring for stored credentials is a requirement, not an add-on.", "A team needs granular, role-based sharing and admin controls, not just individual vaults."],
    decisions: [
      { heading: "Open-source transparency", fit: "Bitwarden is the relevant comparison for buyers who want an open-source, independently-auditable password vault.", alternativeSlug: "bitwarden", comparisonSlug: "bitwarden-vs-lastpass" },
      { heading: "Built-in breach monitoring", fit: "Keeper fits teams that want zero-trust architecture with BreachWatch dark-web monitoring built into the vault itself.", alternativeSlug: "keeper", comparisonSlug: "lastpass-vs-keeper" },
      { heading: "Granular team sharing controls", fit: "Dashlane is the closer route when role-based admin controls and granular secure sharing across a team are the priority.", alternativeSlug: "dashlane", comparisonSlug: "dashlane-vs-lastpass" },
    ],
    evidenceSources: ["https://www.lastpass.com"],
  },
  confluence: {
    diagnosis: "The page's alternatives list doesn't separate Confluence's Atlassian-suite team-workspace positioning from an AI-verified-knowledge decision, a docs-as-code decision, or a Slack-native-Q&A decision.",
    heading: "Decide how your team actually keeps knowledge current",
    introduction: "Confluence centers on documentation and meeting notes shared across an organization inside the Atlassian suite. The useful alternatives question is which property matters most: continuously-verified accuracy, a git-based docs workflow, or a Slack-native Q&A layer.",
    whySeekAlternative: ["Stale or outdated content needs to be flagged and continuously verified, not just stored.", "Documentation is technical/product-facing and should follow a git-based branch-review-merge workflow.", "The team lives in Slack and wants knowledge answered there directly, not in a separate wiki tab."],
    decisions: [
      { heading: "Continuously-verified knowledge", fit: "Guru is the relevant comparison for teams that want company information actively organized and verified, not just stored.", alternativeSlug: "guru", comparisonSlug: "confluence-vs-guru" },
      { heading: "Docs-as-code workflow", fit: "GitBook fits technical teams that want documentation to follow a git-based branch, review, and merge process.", alternativeSlug: "gitbook", comparisonSlug: "confluence-vs-gitbook" },
      { heading: "Slack-native Q&A", fit: "Tettra is the closer route when an AI Q&A bot answering directly from Slack matters more than a standalone wiki.", alternativeSlug: "tettra", comparisonSlug: "confluence-vs-tettra" },
    ],
    evidenceSources: ["https://www.atlassian.com/software/confluence"],
  },
  mulesoft: {
    diagnosis: "The page's alternatives list doesn't distinguish MuleSoft's full-lifecycle iPaaS/API-management positioning from an AI-agent-connectivity decision, a Google-Cloud-native decision, or an API-discovery-and-monetization decision.",
    heading: "Decide which part of API management you actually need",
    introduction: "MuleSoft Anypoint Platform is Salesforce's unified iPaaS and full-lifecycle API management product. The useful alternatives question is whether the real need is that full lifecycle, or a more specific piece: AI-agent connectivity, Google Cloud-native management, or an API marketplace.",
    whySeekAlternative: ["The priority is connecting and governing AI agents, not general-purpose integration.", "The stack is already Google Cloud-centric and API management should live there natively.", "Discovering, testing, and monetizing third-party APIs matters more than internal API governance."],
    decisions: [
      { heading: "AI-agent connectivity", fit: "Kong is the relevant comparison for teams whose core requirement is securely connecting and governing AI agents, not general iPaaS.", alternativeSlug: "kong", comparisonSlug: "kong-vs-mulesoft" },
      { heading: "Google Cloud-native management", fit: "Apigee fits teams already on Google Cloud who want API design, security, and analytics native to that platform.", alternativeSlug: "apigee", comparisonSlug: "apigee-vs-mulesoft" },
      { heading: "API discovery and monetization", fit: "RapidAPI is the closer route when discovering, testing, and monetizing third-party APIs through a marketplace is the priority.", alternativeSlug: "rapidapi", comparisonSlug: "mulesoft-vs-rapidapi" },
    ],
    evidenceSources: ["https://www.mulesoft.com"],
  },
  freshdesk: {
    diagnosis: "The page emphasizes AI but does not separate core ticketing from omnichannel, ecommerce-specialist, and AI-led support choices across its comparison inventory.",
    heading: "Match the alternative to the support operation",
    introduction: "Freshdesk's current plans combine ticketing, a shared inbox, self-service, analytics, routing, and optional AI capabilities. An alternative should be evaluated against the support model: enterprise service operations, conversational AI, a simpler shared inbox, or ecommerce-specific customer context.",
    whySeekAlternative: ["The team needs a different balance between ticketing depth and conversational support.", "AI-agent or copilot costs must be evaluated separately from core agent seats.", "Ecommerce order context or cross-team collaboration is central to resolution work."],
    decisions: [
      { heading: "Broader service operations", fit: "Zendesk is the relevant comparison for organizations evaluating wider omnichannel and service-management capability.", alternativeSlug: "zendesk", comparisonSlug: "freshdesk-vs-zendesk" },
      { heading: "AI-led conversational support", fit: "Intercom is the path when an integrated AI agent and messenger-led support model drive the decision.", alternativeSlug: "intercom", comparisonSlug: "freshdesk-vs-intercom" },
      { heading: "Simpler shared-inbox workflow", fit: "Help Scout is useful for teams prioritizing an inbox, knowledge base, and straightforward collaboration model.", alternativeSlug: "help-scout", comparisonSlug: "freshdesk-vs-help-scout" },
      { heading: "Ecommerce-specific customer context", fit: "Gorgias is the relevant comparison for ecommerce teams that need Shopify-linked live order and customer data plus in-conversation order actions inside the support workflow.", alternativeSlug: "gorgias", comparisonSlug: "freshdesk-vs-gorgias" },
    ],
    evidenceSources: ["https://www.freshworks.com/freshdesk/pricing/", "https://www.freshworks.com/freshdesk/features/", "https://www.gorgias.com"],
  },
  buffer: {
    diagnosis: "The current two-option section does not answer the recurring free-alternative queries or distinguish lightweight publishing from enterprise social intelligence.",
    heading: "Choose by social workflow, not feature count",
    introduction: "Buffer is positioned around creating, scheduling, publishing, engagement, and analytics across social channels. The alternative decision changes depending on whether the buyer wants a lightweight publishing workflow, deeper listening and reporting, or a broader enterprise management layer.",
    whySeekAlternative: ["The number of channels, users, or approval steps changes the plan fit.", "Listening, competitive intelligence, and advanced reporting outweigh publishing simplicity.", "The team needs a different collaboration model for agencies or larger brand operations."],
    decisions: [
      { heading: "Enterprise social management", fit: "Hootsuite is the relevant comparison for wider account management, monitoring, and enterprise workflows.", alternativeSlug: "hootsuite", comparisonSlug: "buffer-vs-hootsuite" },
      { heading: "Social intelligence and listening", fit: "Sprout Social fits evaluations where listening, analytics, and structured engagement operations lead the purchase.", alternativeSlug: "sprout-social", comparisonSlug: "buffer-vs-sprout-social" },
      { heading: "Campaign automation beyond social", fit: "ActiveCampaign is relevant only when the real requirement extends into email and customer-journey automation; it is not a direct scheduler substitute.", alternativeSlug: "activecampaign", comparisonSlug: "activecampaign-vs-buffer" },
    ],
    evidenceSources: ["https://buffer.com/pricing", "https://buffer.com"],
  },
  ringcentral: {
    diagnosis: "The current alternatives lean toward meetings and collaboration even though the query cluster is a business-phone and communications-platform decision.",
    heading: "Separate business calling from team collaboration",
    introduction: "RingCentral's RingEX offering combines business calling, messaging, video, and AI assistance, with contact-center and receptionist products alongside it. Alternatives should be compared against the exact communications layer being replaced: phone system, Microsoft-centered collaboration, or meeting platform.",
    whySeekAlternative: ["The business primarily needs a cloud phone system rather than a full communications suite.", "Microsoft 365 integration defines the collaboration environment.", "Video meetings and webinars matter more than telephony administration."],
    decisions: [
      { heading: "Cloud phone system focus", fit: "KrispCall is the Miloosh-covered comparison when calling, numbers, and phone workflows are the central requirement.", alternativeSlug: "krispcall", comparisonSlug: "krispcall-vs-ringcentral" },
      { heading: "Microsoft-centered collaboration", fit: "Microsoft Teams is relevant when chat, meetings, files, and Microsoft 365 integration shape the decision.", alternativeSlug: "microsoft-teams", comparisonSlug: "microsoft-teams-vs-ringcentral" },
      { heading: "Meetings plus enterprise collaboration", fit: "Webex provides another calling, messaging, meetings, and webinar path for organizations comparing unified communications stacks.", alternativeSlug: "webex", comparisonSlug: "ringcentral-vs-webex" },
    ],
    evidenceSources: ["https://www.ringcentral.com/office/plansandpricing.html"],
  },
  "help-scout": {
    diagnosis: "The page lists only Front and Crisp and lacks the pricing and operating-model context needed to compare a shared inbox with AI-led or ticketing-heavy support platforms.",
    heading: "Choose the support model before the vendor",
    introduction: "Help Scout combines shared inboxes, customer channels, knowledge bases, automation, reporting, and separately priced AI Answers. A credible alternative depends on whether the team wants simpler inbox collaboration, AI-agent-led conversations, or more formal ticketing and routing depth.",
    whySeekAlternative: ["Support volume requires more advanced routing, SLAs, or service administration.", "An AI agent is intended to lead the customer interaction rather than complement the inbox.", "Cross-functional teams need customer communication to move beyond a support-owned queue."],
    decisions: [
      { heading: "AI-agent-led support", fit: "Intercom is the relevant path when Fin and messenger-based automation are central to the service design.", alternativeSlug: "intercom", comparisonSlug: "help-scout-vs-intercom" },
      { heading: "Cross-team customer operations", fit: "Front is a stronger comparison when support, operations, sales, and account teams share ownership of customer communication.", alternativeSlug: "front", comparisonSlug: "front-vs-help-scout" },
      { heading: "Traditional helpdesk depth", fit: "Freshdesk fits evaluations that prioritize ticketing, routing, portals, and broader helpdesk administration.", alternativeSlug: "freshdesk", comparisonSlug: "freshdesk-vs-help-scout" },
    ],
    evidenceSources: ["https://www.helpscout.com/pricing/"],
  },
  intercom: {
    diagnosis: "Forty-two query variants map to the correct page, but the current two alternatives do not cover the distinct AI-agent, conventional helpdesk, and cross-team operations choices.",
    heading: "Compare Intercom by service architecture",
    introduction: "Intercom pairs its helpdesk with Fin, an integrated AI agent. The alternative decision is clearest when buyers decide whether AI should lead resolution, whether a conventional ticketing platform should remain central, or whether customer communication belongs in a cross-team operational inbox.",
    whySeekAlternative: ["The organization wants a ticketing-led service stack rather than an AI-agent-first model.", "A smaller support team values a simpler inbox and knowledge-base setup.", "Customer conversations require collaboration across support, sales, and operations."],
    decisions: [
      { heading: "Ticketing-led enterprise service", fit: "Zendesk is the relevant route for broader ticketing, service administration, and contact-center evaluation.", alternativeSlug: "zendesk", comparisonSlug: "intercom-vs-zendesk" },
      { heading: "Simpler support-team workflow", fit: "Help Scout fits teams that prioritize a shared inbox, Docs, and a less expansive service platform.", alternativeSlug: "help-scout", comparisonSlug: "help-scout-vs-intercom" },
      { heading: "Cross-functional customer operations", fit: "Front is the comparison for organizations where multiple business teams jointly manage external communication.", alternativeSlug: "front", comparisonSlug: "front-vs-intercom" },
    ],
    evidenceSources: ["https://www.intercom.com/pricing", "https://www.intercom.com/helpdesk"],
  },
  front: {
    diagnosis: "Almost all page visibility comes from alternatives queries, yet the current two-option section does not distinguish shared inbox, helpdesk, AI-agent, and ecommerce-support decisions.",
    heading: "Identify who owns the customer conversation",
    introduction: "Front combines shared inboxes, ticketing, workflow automation, and AI for customer operations. Its alternatives become clearer when ownership is defined: a dedicated support team, an AI-led conversational service, or a traditional helpdesk with structured routing and portals.",
    whySeekAlternative: ["Customer communication belongs mainly to a dedicated support function rather than several teams.", "The desired workflow begins with an AI agent or embedded messenger.", "Formal ticket routing, self-service, and service administration matter more than email-style collaboration."],
    decisions: [
      { heading: "Support-owned shared inbox", fit: "Help Scout is the relevant comparison for teams seeking a focused support inbox, knowledge base, and customer messaging toolkit.", alternativeSlug: "help-scout", comparisonSlug: "front-vs-help-scout" },
      { heading: "AI-led conversational service", fit: "Intercom fits evaluations centered on an integrated AI agent and messenger-based customer support.", alternativeSlug: "intercom", comparisonSlug: "front-vs-intercom" },
      { heading: "Structured helpdesk operations", fit: "Freshdesk is the route when ticketing, routing, portals, and helpdesk administration are the core requirements.", alternativeSlug: "freshdesk", comparisonSlug: "freshdesk-vs-front" },
    ],
    evidenceSources: ["https://front.com/pricing", "https://front.com/product"],
  },
  woocommerce: {
    diagnosis: "WooCommerce's page lists two alternatives without explaining the decision that actually separates them: staying self-hosted on WordPress versus moving to a managed, hosted platform.",
    heading: "Choose a WooCommerce alternative by hosting model",
    introduction: "WooCommerce is a self-hosted, open-source plugin: it runs on WordPress, and the merchant (or their developer/agency) owns hosting, updates, and server maintenance in exchange for full control. The relevant alternatives question is whether that ownership is still wanted, or whether a managed, all-in-one platform is a better fit.",
    whySeekAlternative: [
      "The team doesn't want to manage WordPress hosting, plugin updates, or server maintenance.",
      "Built-in checkout, payments, and multichannel selling matter more than plugin-level customization.",
      "The team wants to stay open-source and self-hosted, but outside the WordPress plugin ecosystem specifically.",
    ],
    decisions: [
      { heading: "A managed, hosted platform", fit: "Shopify is the relevant path when a merchant wants built-in checkout, payments, and multichannel selling without owning WordPress hosting, plugins, or updates.", alternativeSlug: "shopify", comparisonSlug: "shopify-vs-woocommerce" },
      { heading: "Open-source ownership outside WordPress", fit: "PrestaShop is worth comparing when a merchant wants to stay open-source and self-hosted but outside the WordPress plugin ecosystem.", alternativeSlug: "prestashop", comparisonSlug: "prestashop-vs-woocommerce" },
    ],
    evidenceSources: ["https://woocommerce.com", "https://www.shopify.com"],
  },
  ecwid: {
    diagnosis: "Ecwid's page lists two alternatives without explaining the decision that actually matters: adding a cart widget to an existing site versus running a dedicated, standalone store.",
    heading: "Choose an Ecwid alternative by store structure",
    introduction: "Ecwid is built to be embedded: a shopping-cart widget added into an existing WordPress, Wix, or custom site, with zero platform transaction fees. The relevant alternatives question is whether that embedded model still fits, or whether the business has outgrown it into needing a dedicated, full-featured store.",
    whySeekAlternative: [
      "The business has outgrown adding a cart to an existing site and needs a dedicated, standalone store.",
      "Multichannel selling, apps, and a broader ecommerce feature set matter more than embedding into a site that already exists.",
      "The team wants full platform ownership and customization rather than an embedded widget.",
    ],
    decisions: [
      { heading: "A dedicated, standalone store", fit: "Shopify is the relevant path when a merchant has outgrown embedding a cart widget and wants a full-featured, dedicated store with multichannel selling.", alternativeSlug: "shopify", comparisonSlug: "ecwid-vs-shopify" },
      { heading: "Open-source ownership and customization", fit: "PrestaShop is worth comparing when a merchant wants full platform ownership and customization rather than an embedded, hosted widget.", alternativeSlug: "prestashop", comparisonSlug: "ecwid-vs-prestashop" },
    ],
    evidenceSources: ["https://www.ecwid.com", "https://www.shopify.com"],
  },
  hubspot: {
    diagnosis: "HubSpot's page lists two alternatives without explaining the decision that actually separates them: a single AI-enabled platform across departments versus a simpler, sales-focused pipeline tool.",
    heading: "Choose a HubSpot alternative by team scope",
    introduction: "HubSpot's free CRM is positioned for startups and small businesses that want to manage customers immediately and scale without a data migration later. The relevant alternatives question is whether the team actually needs that broader cross-departmental platform, or a simpler tool scoped to sales alone.",
    whySeekAlternative: [
      "The team is sales-only and doesn't need marketing and service tools bundled into the same platform.",
      "A simpler, more visual pipeline view matters more than an all-in-one platform's breadth.",
      "The organization is large enough to need one AI-enabled platform spanning multiple departments, not just sales.",
    ],
    decisions: [
      { heading: "A simpler, sales-focused pipeline", fit: "Pipedrive is the relevant path when the team is sales-only and wants a simpler pipeline view without marketing and service tools bundled in.", alternativeSlug: "pipedrive", comparisonSlug: "hubspot-vs-pipedrive" },
      { heading: "One AI-enabled platform across departments", fit: "Salesforce is worth comparing for larger organizations that need one platform spanning sales, service, and other departments.", alternativeSlug: "salesforce", comparisonSlug: "hubspot-vs-salesforce" },
    ],
    evidenceSources: ["https://www.hubspot.com/pricing", "https://www.pipedrive.com/en/pricing"],
  },
  squarespace: {
    diagnosis: "Squarespace's page lists two alternatives without explaining the decision that actually separates them: an accessible, free-to-start site builder versus maximum customization through self-hosting.",
    heading: "Choose a Squarespace alternative by control vs. simplicity",
    introduction: "Squarespace positions itself for entrepreneurs, freelancers, and small business owners who want a polished website with integrated business tools, without coding. The relevant alternatives question is whether an even more accessible free-to-start builder fits better, or whether the team actually wants the deeper customization and control that comes with self-hosting.",
    whySeekAlternative: [
      "The business wants a free-to-start site builder rather than Squarespace's paid-only model.",
      "Maximum customization and self-hosting control matter more than an integrated, managed platform.",
      "The site needs a plugin ecosystem broader than what a closed, all-in-one builder offers.",
    ],
    decisions: [
      { heading: "A free-to-start, accessible builder", fit: "Wix is the relevant path when a small business owner wants an accessible site builder with a genuine free-to-start tier.", alternativeSlug: "wix", comparisonSlug: "squarespace-vs-wix" },
      { heading: "Maximum customization and self-hosting", fit: "WordPress is worth comparing when the team wants maximum customization and control through self-hosting rather than a managed, closed platform.", alternativeSlug: "wordpress", comparisonSlug: "squarespace-vs-wordpress" },
    ],
    evidenceSources: ["https://www.squarespace.com/pricing", "https://www.wix.com"],
  },
};

export function getAlternativeGuide(slug: string): AlternativeGuide | undefined {
  return ALTERNATIVE_GUIDES[slug];
}

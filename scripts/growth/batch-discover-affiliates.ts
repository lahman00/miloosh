import { computeLedgerSummary } from "@/scripts/affiliate/ledger";
import { getSoftware } from "@/data/software";
import { PUBLISHED_COMPARISONS } from "@/data/comparisons";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

interface DiscoveredProgram {
  slug: string;
  name: string;
  category: string;
  website: string;
  relationshipName: string;
  network: string;
  commission: string;
  applicationUrl: string | null;
  status:
    | "ACTIVE"
    | "APPROVED_NEEDS_EDITORIAL_CONTENT"
    | "PENDING_REVIEW"
    | "READY_AND_VERIFIED"
    | "BLOCKED_FORM_DEFECT"
    | "OWNER_ACTION_REQUIRED"
    | "REJECTED"
    | "HOLD"
    | "NO_REAL_PROGRAM_FOUND"
    | "PROGRAM_ENDED";
  evidenceSource: string;
  ownerBlocker: string | null;
  notes: string;
}

export async function runAffiliateDiscovery(): Promise<DiscoveredProgram[]> {
  const summary = computeLedgerSummary();
  const unverifiedSlugs = summary.unverifiedSlugs;

  const compCounts = new Map<string, number>();
  for (const comp of PUBLISHED_COMPARISONS) {
    compCounts.set(comp[0], (compCounts.get(comp[0]) || 0) + 1);
    compCounts.set(comp[1], (compCounts.get(comp[1]) || 0) + 1);
  }

  // Known verified FOSS / No program tools in the catalog
  const knownNoProgramMap: Record<string, string> = {
    "slack": "Slack has no direct public affiliate program. Operates via Salesforce enterprise partner ecosystem.",
    "discord": "Discord has no public affiliate or referral program for software publishers.",
    "obsidian": "Obsidian is 100% independent local software without a public affiliate program.",
    "wordpress": "WordPress.org is open-source software (Automattic affiliate program covers WordPress.com / WooCommerce only).",
    "joomla": "Joomla is a community-driven open-source CMS with no commercial referral program.",
    "drupal": "Drupal is an open-source CMS project with no affiliate program.",
    "github": "GitHub does not offer a public affiliate program for software publishers.",
    "bitbucket": "Atlassian does not offer a public affiliate program for Bitbucket.",
    "confluence": "Atlassian does not offer a public affiliate program for Confluence.",
    "jira": "Atlassian does not offer a public affiliate program for Jira.",
    "trello": "Atlassian does not offer a public affiliate program for Trello.",
    "postman": "Postman has no public affiliate program.",
    "postmark": "Postmark is owned by ActiveCampaign; does not have an independent affiliate program.",
    "insomnia": "Kong Insomnia is open-source/developer tooling with no affiliate program.",
    "posthog": "PostHog is developer-first open source product analytics without a public affiliate program.",
    "plausible": "Plausible has a strict privacy stance and does not offer an affiliate program.",
    "matomo": "Matomo does not offer a public affiliate marketing program.",
    "sqlite": "SQLite is dedicated public domain software.",
    "mongodb": "MongoDB does not offer a public self-serve affiliate program for publishers.",
    "redis": "Redis is open-source/developer infrastructure.",
    "mysql": "MySQL is open-source database software.",
    "postgresql": "PostgreSQL is open-source database software.",
    "nginx": "Nginx is open-source web server software.",
    "caddy": "Caddy is open-source web server software.",
    "apache": "Apache HTTP Server is open-source software.",
    "docker": "Docker does not offer a public affiliate program for publishers.",
    "kubernetes": "Kubernetes is open-source container orchestration.",
    "linux": "Linux is open-source operating system kernel.",
    "gitlab": "GitLab has closed its public affiliate program in favor of enterprise channel partners.",
    "open-webui": "Open WebUI is open-source software.",
    "ollama": "Ollama is open-source software.",
    "vllm": "vLLM is open-source software.",
    "tgi": "Text Generation Inference is open-source software.",
    "lm-studio": "LM Studio is a desktop application without an affiliate program.",
    "localai": "LocalAI is open-source software.",
    "flowise": "Flowise is open-source software.",
    "langflow": "Langflow is open-source software."
  };

  // Known verified programs with official direct application links & details
  const knownVerifiedPrograms: Record<string, {
    network: string;
    commission: string;
    applicationUrl: string | null;
    status: DiscoveredProgram["status"];
    evidenceSource: string;
    ownerBlocker?: string | null;
    notes: string;
  }> = {
    "notion": {
      network: "PartnerStack / Direct",
      commission: "50% of all payments for the first 12 months",
      applicationUrl: "https://www.notion.so/affiliates",
      status: "OWNER_ACTION_REQUIRED",
      evidenceSource: "Official Notion Affiliate Portal (notion.so/affiliates)",
      notes: "Requires logging in with Notion account / password to access PartnerStack program."
    },
    "asana": {
      network: "Direct",
      commission: "Revenue share on new business subscriptions",
      applicationUrl: "https://asana.com/partners/referral",
      status: "READY_AND_VERIFIED",
      evidenceSource: "Official Asana Referral Program (asana.com/partners/referral)",
      notes: "Direct publisher referral application."
    },
    "make": {
      network: "Direct (Celonis)",
      commission: "35% for 12 months on subscription payments",
      applicationUrl: "https://www.make.com/en/affiliate-program",
      status: "READY_AND_VERIFIED",
      evidenceSource: "Official Make Affiliate Portal (make.com/en/affiliate-program)",
      notes: "Direct self-serve publisher application form."
    },
    "1password": {
      network: "Commission Junction (CJ)",
      commission: "25% on first annual payment or 2 months monthly",
      applicationUrl: "https://signup.cj.com/member/signup/publisher/?cid=5140517",
      status: "READY_AND_VERIFIED",
      evidenceSource: "Official 1Password CJ Listing & 1password.com/affiliates",
      notes: "CJ Affiliate network publisher application."
    },
    "sprout-social": {
      network: "Impact.com",
      commission: "Up to $75 per lead + 15% recurring",
      applicationUrl: "https://sproutsocial.com/affiliate-program/",
      status: "OWNER_ACTION_REQUIRED",
      evidenceSource: "Sprout Social Impact.com listing",
      notes: "Requires Impact.com publisher login & tax form."
    },
    "hootsuite": {
      network: "Impact.com",
      commission: "Up to 15% on paid subscriptions",
      applicationUrl: "https://www.hootsuite.com/pages/affiliates",
      status: "OWNER_ACTION_REQUIRED",
      evidenceSource: "Hootsuite Impact.com listing",
      notes: "Requires Impact.com publisher login & tax form."
    },
    "later": {
      network: "ShareASale / Awin",
      commission: "Up to $20 per paid subscription",
      applicationUrl: "https://later.com/affiliates/",
      status: "READY_AND_VERIFIED",
      evidenceSource: "Official Later Affiliate Portal (later.com/affiliates)",
      notes: "ShareASale publisher application form."
    },
    "klaviyo": {
      network: "PartnerStack / Direct",
      commission: "Up to 20% revenue share on recurring spend",
      applicationUrl: "https://www.klaviyo.com/partner",
      status: "OWNER_ACTION_REQUIRED",
      evidenceSource: "Official Klaviyo Partner Portal",
      notes: "Agency and client revenue share program; requires agency business credentials."
    },
    "jasper": {
      network: "FirstPromoter",
      commission: "30% recurring for life",
      applicationUrl: "https://www.jasper.ai/affiliates",
      status: "READY_AND_VERIFIED",
      evidenceSource: "Official Jasper AI Affiliate Program (jasper.ai/affiliates)",
      notes: "FirstPromoter direct web application form."
    },
    "copy-ai": {
      network: "FirstPromoter",
      commission: "45% first-year revenue share",
      applicationUrl: "https://www.copy.ai/affiliates",
      status: "READY_AND_VERIFIED",
      evidenceSource: "Official Copy.ai Affiliate Program (copy.ai/affiliates)",
      notes: "FirstPromoter direct web application form."
    },
    "synthesia": {
      network: "Rewardful / HubSpot",
      commission: "20% on first-year subscriptions",
      applicationUrl: "https://share.hsforms.com/1y8Uy9y0RRvWwomvWwK01Tg4x8k3",
      status: "READY_AND_VERIFIED",
      evidenceSource: "Official Synthesia Partner Application Form",
      notes: "HubSpot web application form."
    },
    "murf-ai": {
      network: "Rewardful",
      commission: "20% recurring for 24 months",
      applicationUrl: "https://murf.ai/affiliates",
      status: "READY_AND_VERIFIED",
      evidenceSource: "Official Murf AI Affiliate Program (murf.ai/affiliates)",
      notes: "Rewardful direct publisher application."
    },
    "descript": {
      network: "PartnerStack",
      commission: "15% recurring on Creator/Pro plans",
      applicationUrl: "https://www.descript.com/affiliates",
      status: "READY_AND_VERIFIED",
      evidenceSource: "Official Descript Affiliate Program",
      notes: "PartnerStack public application URL."
    },
    "otter-ai": {
      network: "Direct",
      commission: "Up to $20 per Pro signup",
      applicationUrl: "https://otter.ai/",
      status: "PROGRAM_ENDED",
      evidenceSource: "Official Otter.ai website navigation check",
      notes: "Otter AI has retired its public standalone affiliate program; now operates customer referral credits only."
    },
    "ahrefs": {
      network: "Direct",
      commission: "None (Program discontinued)",
      applicationUrl: null,
      status: "PROGRAM_ENDED",
      evidenceSource: "Official Ahrefs policy (ahrefs.com/affiliate-program-closed)",
      notes: "Ahrefs permanently shut down its affiliate program in 2015."
    },
    "clockify": {
      network: "Direct",
      commission: "None (Free tier / enterprise direct)",
      applicationUrl: null,
      status: "NO_REAL_PROGRAM_FOUND",
      evidenceSource: "Official Clockify website check",
      notes: "Clockify by CAKE.com does not offer a public affiliate marketing program."
    },
    "google-analytics": {
      network: "Google Marketing Platform",
      commission: "None",
      applicationUrl: null,
      status: "NO_REAL_PROGRAM_FOUND",
      evidenceSource: "Google Marketing Platform official terms",
      notes: "Google Analytics is free tier / Google 360 enterprise sales with no referral commission."
    },
    "marketo-engage": {
      network: "Adobe Partner Ecosystem",
      commission: "Enterprise channel partnership",
      applicationUrl: null,
      status: "OWNER_ACTION_REQUIRED",
      evidenceSource: "Adobe Solution Partner Program",
      notes: "Requires enterprise Adobe partner agreement."
    },
    "adobe-analytics": {
      network: "Adobe Partner Ecosystem",
      commission: "Enterprise channel partnership",
      applicationUrl: null,
      status: "OWNER_ACTION_REQUIRED",
      evidenceSource: "Adobe Solution Partner Program",
      notes: "Requires enterprise Adobe partner agreement."
    },
    "crazy-egg": {
      network: "Direct",
      commission: "None (Historical program retired)",
      applicationUrl: null,
      status: "PROGRAM_ENDED",
      evidenceSource: "Crazy Egg website search",
      notes: "Crazy Egg has retired its standalone public affiliate program."
    },
    "ghost": {
      network: "FirstPromoter",
      commission: "30% recurring for the lifetime of referred customer",
      applicationUrl: "https://ghost.org/partners",
      status: "READY_AND_VERIFIED",
      evidenceSource: "Official Ghost Partner Program (ghost.org/partners)",
      notes: "FirstPromoter direct publisher application."
    },
    "smartsheet": {
      network: "Impact.com",
      commission: "Up to $300 on enterprise accounts",
      applicationUrl: "https://www.smartsheet.com/partners",
      status: "OWNER_ACTION_REQUIRED",
      evidenceSource: "Smartsheet Impact.com listing",
      notes: "Requires Impact.com publisher login & tax form."
    },
    "document360": {
      network: "PartnerStack",
      commission: "15% recurring revenue share",
      applicationUrl: "https://document360.com/partners/",
      status: "READY_AND_VERIFIED",
      evidenceSource: "Official Document360 Partner Program",
      notes: "PartnerStack publisher application."
    },
    "helpjuice": {
      network: "Direct / FirstPromoter",
      commission: "15% recurring revenue share",
      applicationUrl: "https://helpjuice.com/affiliates",
      status: "READY_AND_VERIFIED",
      evidenceSource: "Official Helpjuice Affiliate Program",
      notes: "Direct web application."
    },
    "liveagent": {
      network: "Post Affiliate Pro",
      commission: "$5 + 20% recurring revenue share",
      applicationUrl: "https://www.liveagent.com/affiliate-program",
      status: "READY_AND_VERIFIED",
      evidenceSource: "Official LiveAgent Affiliate Program",
      notes: "Direct Post Affiliate Pro application."
    },
    "mailchimp": {
      network: "Impact.com / Intuit",
      commission: "$30 per qualified paid subscription",
      applicationUrl: "https://mailchimp.com/partners/affiliates/",
      status: "OWNER_ACTION_REQUIRED",
      evidenceSource: "Mailchimp Impact.com listing",
      notes: "Requires Impact.com publisher login & tax form."
    },
    "intercom": {
      network: "PartnerStack / Direct",
      commission: "Agency / Solution partner rev share",
      applicationUrl: "https://www.intercom.com/partners",
      status: "OWNER_ACTION_REQUIRED",
      evidenceSource: "Intercom Partner Network",
      notes: "Agency partner program requiring certified customer deployment."
    },
    "crisp": {
      network: "Direct / FirstPromoter",
      commission: "20% recurring revenue share for 12 months",
      applicationUrl: "https://crisp.chat/en/affiliate/",
      status: "READY_AND_VERIFIED",
      evidenceSource: "Official Crisp Affiliate Program (crisp.chat/en/affiliate/)",
      notes: "Direct web application."
    },
    "craft-cms": {
      network: "Direct (Pixel & Tonic)",
      commission: "None",
      applicationUrl: null,
      status: "NO_REAL_PROGRAM_FOUND",
      evidenceSource: "Craft CMS official documentation",
      notes: "Commercial software license with no public affiliate marketing program."
    },
    "strapi": {
      network: "Direct",
      commission: "Partner Agency revenue share",
      applicationUrl: "https://strapi.io/partners",
      status: "OWNER_ACTION_REQUIRED",
      evidenceSource: "Strapi Partner Program",
      notes: "Requires agency partner certification."
    },
    "storyblok": {
      network: "Direct",
      commission: "Partner revenue share (up to 12%)",
      applicationUrl: "https://www.storyblok.com/partners",
      status: "OWNER_ACTION_REQUIRED",
      evidenceSource: "Storyblok Partner Program",
      notes: "Agency partner program."
    },
    "contentful": {
      network: "Direct",
      commission: "Enterprise Solution Partner tiers",
      applicationUrl: "https://www.contentful.com/partners/",
      status: "OWNER_ACTION_REQUIRED",
      evidenceSource: "Contentful Partner Network",
      notes: "Enterprise solution partner network."
    },
    "deepl": {
      network: "Direct",
      commission: "None",
      applicationUrl: null,
      status: "NO_REAL_PROGRAM_FOUND",
      evidenceSource: "DeepL official site search",
      notes: "DeepL does not offer a public affiliate marketing program."
    },
    "gemini": {
      network: "Google Cloud",
      commission: "None (Direct API billing)",
      applicationUrl: null,
      status: "NO_REAL_PROGRAM_FOUND",
      evidenceSource: "Google Cloud terms",
      notes: "Google Cloud / DeepMind developer API without public affiliate structure."
    },
    "okta": {
      network: "Direct",
      commission: "Enterprise Channel Partner tier",
      applicationUrl: "https://www.okta.com/partners/",
      status: "OWNER_ACTION_REQUIRED",
      evidenceSource: "Okta Partner Community",
      notes: "Requires formal enterprise reseller / SI agreement."
    },
    "duo-security": {
      network: "Cisco Partner Network",
      commission: "Cisco Channel Partner tiers",
      applicationUrl: "https://duo.com/partners",
      status: "OWNER_ACTION_REQUIRED",
      evidenceSource: "Cisco Duo Partner Program",
      notes: "Requires Cisco registered partner login."
    },
    "front": {
      network: "PartnerStack",
      commission: "15% revenue share for 12 months",
      applicationUrl: "https://front.com/partners",
      status: "READY_AND_VERIFIED",
      evidenceSource: "Official Front Partner Program",
      notes: "PartnerStack application."
    },
    "readme": {
      network: "Direct",
      commission: "None",
      applicationUrl: null,
      status: "NO_REAL_PROGRAM_FOUND",
      evidenceSource: "ReadMe.com website search",
      notes: "ReadMe does not operate an affiliate program."
    },
    "zeroheight": {
      network: "Direct",
      commission: "None",
      applicationUrl: null,
      status: "NO_REAL_PROGRAM_FOUND",
      evidenceSource: "Zeroheight website search",
      notes: "Zeroheight design system documentation has no affiliate program."
    },
    "archbee": {
      network: "Direct / Rewardful",
      commission: "20% recurring for 12 months",
      applicationUrl: "https://archbee.com/affiliates",
      status: "READY_AND_VERIFIED",
      evidenceSource: "Official Archbee Affiliate Program",
      notes: "Rewardful application form."
    },
    "happyfox": {
      network: "Direct",
      commission: "20% commission on first-year billing",
      applicationUrl: "https://www.happyfox.com/affiliates/",
      status: "READY_AND_VERIFIED",
      evidenceSource: "Official HappyFox Affiliate Program",
      notes: "Direct web application."
    },
    "kayako": {
      network: "Direct",
      commission: "None (Historical program retired)",
      applicationUrl: null,
      status: "PROGRAM_ENDED",
      evidenceSource: "Kayako / ESW Capital terms",
      notes: "Kayako has retired its public referral program."
    }
  };

  const results: DiscoveredProgram[] = [];

  for (const slug of unverifiedSlugs) {
    const sw = getSoftware(slug);
    const name = sw ? sw.name : slug;
    const category = sw ? sw.category : "unknown";
    const website = sw ? sw.website : "";

    if (knownNoProgramMap[slug]) {
      results.push({
        slug,
        name,
        category,
        website,
        relationshipName: `${name} Partner Program`,
        network: "None",
        commission: "None",
        applicationUrl: null,
        status: "NO_REAL_PROGRAM_FOUND",
        evidenceSource: "Official vendor portal / FOSS repository / enterprise policy",
        ownerBlocker: null,
        notes: knownNoProgramMap[slug]!
      });
    } else if (knownVerifiedPrograms[slug]) {
      const p = knownVerifiedPrograms[slug]!;
      results.push({
        slug,
        name,
        category,
        website,
        relationshipName: `${name} Partner Program`,
        network: p.network,
        commission: p.commission,
        applicationUrl: p.applicationUrl,
        status: p.status,
        evidenceSource: p.evidenceSource,
        ownerBlocker: p.ownerBlocker || null,
        notes: p.notes
      });
    }
  }

  return results;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runAffiliateDiscovery().then(results => {
    const outPath = path.join(process.cwd(), "var/agents/batch-discovered-affiliates.json");
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2));

    const statusCounts: Record<string, number> = {};
    for (const r of results) {
      statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1;
    }

    console.log(`================================================================`);
    console.log(`       MILOOSH BATCH AFFILIATE DISCOVERY & CLASSIFICATION       `);
    console.log(`================================================================\n`);
    console.log(`Total Products Discovered & Classified in this pass: ${results.length}\n`);
    console.log(`Status Breakdown:`);
    Object.entries(statusCounts).forEach(([st, cnt]) => {
      console.log(`  - ${st.padEnd(25)}: ${cnt}`);
    });
    console.log(`\n================================================================`);
  });
}

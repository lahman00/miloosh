import type { BuyerChecklist } from "@/data/seo/buyer-checklists";

/** Documentation-based decisions, not observed customer outcomes or new rankings. */
export const BUYER_DEPTH_CHECKLISTS: Record<string, BuyerChecklist> = {
  "trainual": {
    "title": "Before choosing Trainual, validate the annual commitment and training proof",
    "introduction": "Documentation-based buyer checks, not a hands-on evaluation. Keep a simpler wiki if searchable instructions are sufficient; pay for training controls only when you need evidence of completion.",
    "verifiedAt": "2026-10-01",
    "checks": [
      {
        "question": "Is the per-user figure the complete subscription?",
        "answer": "The pricing page displays $3, $4 and $5 per user/month with annual billing, but also a 10-seat / $3,000 annual minimum footnote. Its scope is unclear. Request the base fee, included seats, extra-seat rate and renewal total together. Do not estimate a ten-person subscription as 10 × $3 × 12; that multiplication does not resolve the minimum.",
        "source": "https://trainual.com/pricing-2",
        "sourceLabel": "Trainual rates and minimum-commitment footnote"
      },
      {
        "question": "What belongs in the first-year budget?",
        "answer": "Trainual’s FAQ lists a one-time $1,000 implementation fee. Use an itemized quote: annual subscription + confirmed implementation fee + required add-ons + taxes. Ask what content migration and rollout work is included. A short setup target is not a guarantee that every employee will finish training by that date.",
        "source": "https://trainual.com/faqs",
        "sourceLabel": "Trainual implementation scope and fee"
      },
      {
        "question": "Can the selected edition prove the required training?",
        "answer": "Individual training paths and e-signatures begin at Pro; SSO and custom domain begin at Premium; API support is Enterprise. During the vendor evaluation, use a sanitized procedure with an assignment, due date and quiz. Require a reviewer to retrieve completion evidence. Confirm course-library add-ons separately: the page’s summary and comparison table are not consistent on their inclusion.",
        "source": "https://trainual.com/pricing",
        "sourceLabel": "Trainual edition and training-control matrix"
      }
    ],
    "options": [
      {
        "slug": "trainual",
        "fit": "Keep Trainual only if assigned learning, completion evidence and the full annual quote fit. The wiki alternatives above remain valid when formal training is unnecessary."
      }
    ]
  },
  "zoho-flow": {
    "title": "Before choosing Zoho Flow, count actions and test the failure path",
    "introduction": "Documentation-based buyer checks, not a completed integration test. Start with one real event and the required result. An existing native integration may be enough; a new automation subscription is not always necessary.",
    "verifiedAt": "2026-10-01",
    "checks": [
      {
        "question": "How many billable actions does each event create?",
        "answer": "Zoho counts each successful action execution as a task. Worked example, not measured usage: 2,000 events × 3 billable actions = 6,000 tasks before any additional billable executions. That exceeds the 5,000-task Standard starting tier. Price the next task tier rather than treating 2,000 workflow runs as 2,000 tasks.",
        "source": "https://www.zoho.com/flow/pricing.html",
        "sourceLabel": "Zoho Flow task definition and plan allowances"
      },
      {
        "question": "Does the workflow fit the connector and timing limits?",
        "answer": "Standard polls every 15 minutes; Professional lists five-minute polling, premium connectors and automatic reruns. Polling intervals are not webhook-delivery guarantees. Verify the exact trigger and action in both connected apps, then replay a sanitized event with a stable external ID. Check whether a retry creates a duplicate before switching on the production flow.",
        "source": "https://www.zoho.com/flow/pricing.html",
        "sourceLabel": "Zoho Flow connector and recovery boundaries"
      },
      {
        "question": "What happens when the task budget runs out?",
        "answer": "With overage disabled, flows stop at the monthly task limit. Overage can keep them running, but is billed separately and has a daily cap. Choose a budget owner, confirm the rate and reset timezone, and document an alert and manual fallback. AI credits are a separate allowance; do not treat a task upgrade as unlimited AI use.",
        "source": "https://help.zoho.com/portal/en/kb/flow/user-guide/settings/general/articles/billing-usage",
        "sourceLabel": "Zoho Flow billing, overage and credit controls"
      }
    ],
    "options": [
      {
        "slug": "zoho-flow",
        "fit": "Evaluate Zoho Flow after a connector, task-budget and failure-recovery check. Stay with the existing workflow when the extra platform would not remove a concrete limitation."
      }
    ]
  },
  "zoho-desk": {
    "title": "Before choosing Zoho Desk, map agents, departments and internal reviewers",
    "introduction": "Documentation-based buyer checks, not a hands-on help-desk migration. Keep your existing help desk when its ticket workflow still fits; compare a replacement using the same users and service requirements.",
    "verifiedAt": "2026-10-01",
    "checks": [
      {
        "question": "Which requirement determines the minimum edition?",
        "answer": "The edition matrix caps Free at three users and Express at five. Multi-department support starts at Professional, with up to ten departments. A six-agent team needing two departments therefore cannot use the Express headline price. Write down the user, department and channel requirements before requesting a quote.",
        "source": "https://www.zoho.com/desk/pricing-comparison.html",
        "sourceLabel": "Zoho Desk user and department limits"
      },
      {
        "question": "Who replies to customers, and who only adds private notes?",
        "answer": "Light agents can assist internally, but cannot reply to customers or own tickets. Separate customer-facing agents from finance, engineering and management reviewers. The help article describes light agents in all paid editions, while the edition matrix excludes Express; ask Zoho to confirm eligibility and add-on cost in writing rather than treating those seats as free.",
        "source": "https://help.zoho.com/portal/en/kb/desk/user-management-and-security/agents-and-teams/articles/add-manage-desk-agents",
        "sourceLabel": "Zoho Desk light-agent permissions and eligibility caveat"
      },
      {
        "question": "What is the comparable subscription budget?",
        "answer": "Worked example, not a vendor quote: six Professional agents at the published USD annual-billing rate cost 6 × $23 × 12 = $1,656 per year before taxes and add-ons. At $35 per agent on monthly billing, six seats cost $210 per month. List light-agent, messaging and AI-provider charges separately. Test one ticket through intake, assignment, reply and closure before migrating live work.",
        "source": "https://www.zoho.com/desk/pricing.html",
        "sourceLabel": "Zoho Desk USD monthly and annual-billing prices"
      }
    ],
    "options": [
      {
        "slug": "zoho-desk",
        "fit": "Keep Zoho Desk on the shortlist when its actual edition fits the support operation. Compare the same full-agent and internal-reviewer roles across alternatives."
      }
    ]
  },
  "close": {
    "title": "Before choosing Close, price the team rather than the Solo headline",
    "introduction": "Documentation-based buyer checks, not a hands-on sales trial. Preserve the existing CRM if it already supports the required follow-up and export workflow without a costly migration.",
    "verifiedAt": "2026-10-01",
    "checks": [
      {
        "question": "Does the team need automated follow-ups?",
        "answer": "Solo is one user; automated workflows require Growth or Scale. Worked example: four Growth seats at the USD annual-billing rate are 4 × $99 × 12 = $4,752 per year, before usage and taxes. Four Essentials seats would be $1,680 per year, but would not include those workflows. Compare equivalent requirements, not just the difference in seat prices.",
        "source": "https://close.com/pricing",
        "sourceLabel": "Close plan gates and annual-billing rates"
      },
      {
        "question": "Which usage charges sit outside the seat subscription?",
        "answer": "Phone numbers, calls, SMS and certain AI tools use separate balances. Call rates depend on destination and number type, and calls are rounded up to billable minutes. Model the destinations and call pattern your team actually uses, including forwarding. Name a person to review the usage report; do not turn a headline per-minute example into a universal rate.",
        "source": "https://help.close.com/account-management/variable-usage-costs-calling-sms-phone-numbers-ai-tools",
        "sourceLabel": "Close variable usage costs and rounding"
      },
      {
        "question": "Can you leave with the history you need?",
        "answer": "For Close’s built-in exporter, JSON includes activity data that the standard CSV export does not. Use a sample lead with a note, email and call before committing. Confirm that the destination can import the actual file and retain needed relationships; an available export is not proof of a lossless move. Keep credentials inside approved vendor tools.",
        "source": "https://help.close.com/account-management/exporting-data",
        "sourceLabel": "Close export formats and activity coverage"
      }
    ],
    "options": [
      {
        "slug": "close",
        "fit": "Evaluate Close when sales communication and the required follow-up workflow belong together. Keep the alternatives above in the comparison; no paid tier is necessary solely because it is recommended here."
      }
    ]
  }
};

/** Actual October 1 editorial release date; never advanced at build time. */
export const BUYER_DEPTH_CONTENT_UPDATED_AT = "2026-10-01";
export const BUYER_DEPTH_GUIDE_PATHS = [
  "/best-knowledge-base-software-for-teams",
  "/best-automation-software-for-small-business",
  "/best-help-desk-for-small-business",
  "/best-crm-for-sales-teams",
] as const;

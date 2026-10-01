import type { BuyerChecklist } from "@/data/seo/buyer-checklists";

/** Documentation-based decisions, not observed customer outcomes or new rankings. */
export const BUYER_DEPTH_CHECKLISTS: Record<string, BuyerChecklist> = {
  "todoist": {
    "title": "Before choosing Todoist, separate personal capacity from team governance",
    "introduction": "Documentation-based buyer checks, not a hands-on productivity trial. Keep Beginner when the personal workflow fits; pay for Pro or Business only when the missing capacity, planning view or team control is concrete.",
    "verifiedAt": "2026-10-01",
    "checks": [
      {
        "question": "Does Beginner already cover the personal workflow?",
        "answer": "Todoist currently lists Beginner with five active personal projects, three filter views, reminders, list and board layouts, and one week of activity history. Pro expands personal capacity to 300 projects and adds calendar layout, task duration, custom reminders, 150 filter views and full reporting history. Write down the exact missing feature before paying for Pro rather than treating every active Todoist user as a paid-plan user.",
        "source": "https://www.todoist.com/pricing",
        "sourceLabel": "Todoist current plan comparison"
      },
      {
        "question": "Is this an individual upgrade or a team subscription?",
        "answer": "Todoist Business is priced per user and adds a shared team workspace, up to 500 team projects, granular team activity logs, roles and permissions, shared templates, folders and centralized billing. Worked example, not a vendor quote: five Business members at the published annual-billing rate of $8 per user/month equal 5 × $8 × 12 = $480 per year before applicable tax. Do not compare that team total with a single-user Pro subscription.",
        "source": "https://www.todoist.com/help/account-and-billing/plans/todoist-business-plan-pricing-update-dF5in65YM",
        "sourceLabel": "Todoist Business pricing and renewal terms"
      },
      {
        "question": "Can you prove the paid feature is worth keeping before renewal?",
        "answer": "Todoist documents a seven-day Pro trial and a 14-day Business trial. Use the relevant trial to test the exact paid feature—such as calendar planning, team permissions or shared team administration—then record whether it changed the workflow. Keep the existing CSV portability checklist separate: a useful trial does not prove that completed history, recurring dates or every field will migrate cleanly later.",
        "source": "https://www.todoist.com/help/account-and-billing/plans/start-a-todoist-pro-trial-LAVIT1Xm3",
        "sourceLabel": "Todoist Pro trial guidance"
      }
    ],
    "options": [
      {
        "slug": "todoist",
        "fit": "Keep Todoist when the required personal or team controls fit the selected plan. Upgrade only for a verified capacity, planning or governance requirement; the existing migration checklist covers portability separately."
      }
    ]
  },
  "setmore": {
    "title": "Before choosing Setmore, count staff calendars and paid-only booking controls",
    "introduction": "Documentation-based buyer checks, not a live booking-system migration. Start with the number of staff calendars and the booking features customers actually need; Free can be sufficient for a small team.",
    "verifiedAt": "2026-10-01",
    "checks": [
      {
        "question": "Does the Free plan already cover the team?",
        "answer": "Setmore currently lists Free for up to four users with unlimited appointments, a branded Booking Page, email reminders, payments and team collaboration tools. Do not upgrade only because customers need online booking or payments. First count the staff calendars and identify the paid-only control that is actually missing.",
        "source": "https://www.setmore.com/pro",
        "sourceLabel": "Setmore Free and Pro plan comparison"
      },
      {
        "question": "Which requirement actually forces Pro?",
        "answer": "Setmore Pro currently adds SMS reminders, two-way calendar sync, recurring appointments, branding removal and other advanced controls. Its web support article lists $12 per user on monthly billing or $5 per user/month with annual billing. If email reminders and one-way booking are enough, Free may remain the better fit; if two-way sync or recurring sessions are required, price Pro for the real staff count.",
        "source": "https://support.setmore.com/en/articles/4475815-setmore-pro-web-desktop",
        "sourceLabel": "Setmore Pro web and desktop features and billing"
      },
      {
        "question": "What does the same staff count cost under each billing cycle?",
        "answer": "Worked example, not a vendor quote: six paid users at the published annual-billing rate cost 6 × $5 × 12 = $360 per year before taxes; the same six users at $12 monthly billing cost $72 per month. Confirm the checkout channel and current quote before paying, because Setmore also documents separate mobile subscription structures. Keep the existing migration checklist for contacts, calendars and appointment continuity.",
        "source": "https://www.setmore.com/faqs",
        "sourceLabel": "Setmore pricing FAQ"
      }
    ],
    "options": [
      {
        "slug": "setmore",
        "fit": "Keep Setmore Free when four or fewer users and the included booking controls are sufficient. Compare Pro only when SMS, two-way sync, recurring appointments or another paid-only feature solves a real requirement."
      }
    ]
  },
  "zoho-projects": {
    "title": "Before choosing Zoho Projects, map users, clients and governance to the edition",
    "introduction": "Documentation-based buyer checks, not a completed project migration. Start with the people who must work in the portal and the controls they need; a low seat price is not useful if the required user type or project control sits in another edition.",
    "verifiedAt": "2026-10-01",
    "checks": [
      {
        "question": "Does the Free edition fit the actual team and project count?",
        "answer": "Zoho currently lists Free for up to five users and three projects. Premium removes the project cap and adds budgeting, time logs/timesheets and larger workflow allowances. Count the internal editors and active projects first; do not compare a five-user free test with a larger production team as though they were equivalent.",
        "source": "https://www.zoho.com/projects/zohoprojects-pricing.html",
        "sourceLabel": "Zoho Projects plan limits and included workflow features"
      },
      {
        "question": "Which external and internal-review roles change the edition?",
        "answer": "Zoho’s billing help lists Client users on Premium and above, Read-Only users and Resources beginning at Enterprise, and Lite Users only on Ultimate. Separate internal editors, external clients, read-only reviewers and resource tracking before choosing a plan. A reviewer who only needs visibility should not automatically be budgeted as a full editor.",
        "source": "https://help.zoho.com/portal/en/kb/projects/billing-and-upgrade/articles/upgrade-or-downgrade",
        "sourceLabel": "Zoho Projects user and add-on availability by plan"
      },
      {
        "question": "What must survive a downgrade or later switch?",
        "answer": "Zoho says a downgrade removes access to features exclusive to the higher plan while retaining the underlying data for later re-upgrade. Before committing, build one representative project with roles, dependencies, timesheets and reports, then verify the exports and reports you would need if the plan is reduced or the tool is replaced.",
        "source": "https://www.zoho.com/projects/zohoprojects-pricing.html",
        "sourceLabel": "Zoho Projects downgrade and trial guidance"
      }
    ],
    "options": [
      {
        "slug": "zoho-projects",
        "fit": "Keep Zoho Projects on the shortlist when its edition matches the real mix of editors, clients, reviewers and project controls. Compare the alternatives if those role boundaries force a larger plan than the workflow needs."
      }
    ]
  },
  "elevenlabs": {
    "title": "Before choosing ElevenLabs, price the actual output and commercial rights",
    "introduction": "Documentation-based buyer checks, not a hands-on audio benchmark. Start with the product you will generate, the model or quality you need, and whether the output is commercial; the monthly credit headline alone does not answer those questions.",
    "verifiedAt": "2026-10-01",
    "checks": [
      {
        "question": "Does the plan permit the way you will publish the output?",
        "answer": "ElevenLabs documents paid-plan commercial rights, while Free output is for non-commercial use with attribution. Starter currently adds a commercial license. If the audio, music, video or agent will support a business or paid project, verify the license before treating Free as the production plan.",
        "source": "https://elevenlabs.io/docs/overview/administration/billing",
        "sourceLabel": "ElevenLabs billing and commercial-rights guidance"
      },
      {
        "question": "How fast will the shared credit pool be consumed?",
        "answer": "ElevenLabs says its creative products draw from one monthly credit pool and that credit cost varies by product and model. Price the exact workload—such as text-to-speech characters, transcription minutes, music or dubbing—using the current pricing table. Do not convert a plan's credit total into a universal number of minutes.",
        "source": "https://elevenlabs.io/pricing",
        "sourceLabel": "ElevenLabs plan credits and product-specific usage"
      },
      {
        "question": "What happens when usage exceeds or outlives the subscription quota?",
        "answer": "Paid-plan credits can roll over for up to two months while the qualifying subscription remains active; downgrade or cancellation changes what happens to unused quota. ElevenLabs also offers Pay As You Go top-ups, but plan-level feature limits still come from the subscription tier. Budget the normal month, peak month and required feature tier separately.",
        "source": "https://elevenlabs.io/docs/overview/administration/pay-as-you-go",
        "sourceLabel": "ElevenLabs Pay As You Go and plan-limit boundaries"
      }
    ],
    "options": [
      {
        "slug": "elevenlabs",
        "fit": "Evaluate ElevenLabs when its commercial rights, model quality and product-specific usage fit the workload. Keep competing voice tools in the shortlist until the same script and output requirement are priced consistently."
      }
    ]
  },
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
  "/best-task-management-for-individuals",
  "/best-scheduling-software-for-small-business",
  "/best-knowledge-base-software-for-teams",
  "/best-automation-software-for-small-business",
  "/best-help-desk-for-small-business",
  "/best-crm-for-sales-teams",
  "/best-project-management-software-for-small-teams",
  "/best-voice-ai-for-creators",
] as const;

/** Only Wave-1 product-record edits changed reusable comparison text. Wave-2
 * checklists are software-page-only and must not refresh unrelated comparisons. */
export const BUYER_DEPTH_COMPARISON_CONTENT_SLUGS = [
  "trainual",
  "zoho-flow",
  "zoho-desk",
  "close",
] as const;

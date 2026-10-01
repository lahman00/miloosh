export type DecisionPath = { href: string; label: string; question: string };

/** Editorial adjacency, not affiliate ranking. Existing pages only; reviewed 2026-09-26. */
export const DECISION_PATHS: Readonly<Record<string, readonly DecisionPath[]>> =
  {
    "/best-task-management-for-individuals": [
      {
        href: "/software/todoist#buyer-checklist",
        label: "Check Todoist plan capacity and team-cost boundaries",
        question: "Considering Todoist? Separate personal Pro features from Business team governance before paying for seats.",
      },
    ],
    "/best-scheduling-software-for-small-business": [
      {
        href: "/software/setmore#buyer-checklist",
        label: "Check Setmore staff count and paid-only booking controls",
        question: "Considering Setmore? Count staff calendars and identify whether SMS, two-way sync or recurring appointments actually require Pro.",
      },
    ],
    "/best-knowledge-base-software-for-teams": [
      {
        "href": "/software/trainual#buyer-checklist",
        "label": "Check Trainual’s training controls and full quote",
        "question": "Do you need assigned employee training and completion evidence, rather than only a wiki?"
      }
    ],
    "/best-automation-software-for-small-business": [
      {
        "href": "/software/zoho-flow#buyer-checklist",
        "label": "Work through Zoho Flow task and overage checks",
        "question": "Is Zoho Flow on your shortlist? Convert workflow runs into billable actions before choosing capacity."
      }
    ],
    "/best-help-desk-for-small-business": [
      {
        "href": "/software/zoho-desk#buyer-checklist",
        "label": "Check Zoho Desk agents, departments and annual cost",
        "question": "Considering Zoho Desk? Separate customer-facing seats from internal reviewers and match the required edition."
      }
    ],
    "/best-crm-for-sales-teams": [
      {
        "href": "/software/close#buyer-checklist",
        "label": "Check Close team cost, usage and export boundaries",
        "question": "Considering Close for the team? Confirm whether automated follow-ups and communication usage change the budget."
      }
    ],
    "/best-project-management-software-for-small-teams": [
      {
        href: "/software/zoho-projects#buyer-checklist",
        label: "Check Zoho Projects user types and edition gates",
        question: "Need clients, read-only reviewers or resource controls? Price those roles before comparing Zoho Projects with a general project tool.",
      },
    ],
    "/best-voice-ai-for-creators": [
      {
        href: "/software/elevenlabs#buyer-checklist",
        label: "Check ElevenLabs credits and commercial-use boundaries",
        question: "Considering ElevenLabs for published work? Match commercial rights and shared-credit usage to the exact output first.",
      },
    ],
    "/best-email-marketing-for-small-business": [
      {
        href: "/software/mailerlite",
        label: "Review MailerLite and its alternatives",
        question:
          "Is MailerLite on your shortlist? Check the product-level tradeoffs before choosing.",
      },
      {
        href: "/compare/mailerlite-vs-moosend",
        label: "Compare MailerLite vs Moosend",
        question:
          "Down to these two tools? Use the head-to-head breakdown rather than a category ranking.",
      },
    ],
    "/best-ecommerce-platform-for-small-business": [
      {
        href: "/compare/omnisend-vs-klaviyo",
        label: "Compare Omnisend vs Klaviyo",
        question:
          "Already decided where to build the store? If Omnisend and Klaviyo are on your messaging shortlist, compare them separately from the store platform.",
      },
      {
        href: "/software/omnisend",
        label: "Review Omnisend and its alternatives",
        question:
          "Considering Omnisend alongside the store platform? Review its fit and limitations before adding another subscription.",
      },
    ],
    "/best-no-code-database-for-operations": [
      {
        href: "/software/jotform",
        label: "Review Jotform and its alternatives",
        question:
          "Is collecting incoming requests the problem, rather than organizing the database? Evaluate the form workflow separately.",
      },
      {
        href: "/compare/surveymonkey-vs-jotform",
        label: "Compare SurveyMonkey vs Jotform",
        question:
          "Are you gathering structured submissions or asking for feedback? Compare these two options before extending the shortlist.",
      },
    ],
    "/best-lead-tracking-for-agencies": [
      {
        href: "/software/jotform",
        label: "Evaluate Jotform for the intake decision",
        question:
          "Need to collect an enquiry before attributing it? Review the intake workflow separately from the attribution tool.",
      },
      {
        href: "/software/surveymonkey",
        label: "Review SurveyMonkey and its alternatives",
        question:
          "Need customer feedback rather than click attribution? That is a different research decision.",
      },
    ],
  };

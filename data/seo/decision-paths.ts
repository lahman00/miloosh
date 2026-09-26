export type DecisionPath = { href: string; label: string; question: string };

/** Editorial adjacency, not affiliate ranking. Existing pages only; reviewed 2026-09-26. */
export const DECISION_PATHS: Readonly<Record<string, readonly DecisionPath[]>> =
  {
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

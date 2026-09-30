/** Source-based buyer checks, not claimed hands-on migrations or a new revenue cohort. */
export type BuyerMigrationCheck = {
  title: string;
  documentedBoundary: string;
  buyerAction: string;
  sourceIds: string[];
};
export type BuyerMigrationChecklist = {
  title: string;
  checkedAt: string;
  contentUpdatedAt: string;
  scope: string;
  checks: BuyerMigrationCheck[];
  sources: { id: string; label: string; url: string }[];
};
export const BUYER_MIGRATION_CHECKLISTS: Readonly<Partial<Record<string, BuyerMigrationChecklist>>> = {
  "todoist": {
    "title": "Can your task history survive the move?",
    "checkedAt": "2026-09-30",
    "contentUpdatedAt": "2026-09-30",
    "scope": "CSV portability when moving into or away from Todoist.",
    "checks": [
      {
        "title": "Decide whether completed history is required",
        "documentedBoundary": "Todoist project CSV exports omit completed tasks. Its Google Sheets export can include them, but omits labels, deadlines, comments, attachments and reminders.",
        "buyerAction": "Choose the export around the records you need to keep; inspect a sample before cancelling the old tool.",
        "sourceIds": [
          "csv"
        ]
      },
      {
        "title": "Check the next occurrence, not just the task name",
        "documentedBoundary": "CSV exports do not retain the start date of a recurring date.",
        "buyerAction": "Compare the next two scheduled occurrences after import. A recurring label by itself does not establish that the schedule survived.",
        "sourceIds": [
          "csv"
        ]
      },
      {
        "title": "Test in an empty project first",
        "documentedBoundary": "Todoist requires UTF-8 CSV and allows up to 300 task rows per project. A successful CSV import has no undo action.",
        "buyerAction": "Use a small sample with labels, dates and assignees, then split larger projects. Keep a backup before importing into live work.",
        "sourceIds": [
          "csv"
        ]
      }
    ],
    "sources": [
      {
        "id": "csv",
        "label": "Todoist CSV import/export limitations",
        "url": "https://www.todoist.com/help/account-and-billing/security/import-or-export-a-project-as-a-csv-file-in-todoist-YC8YvN"
      }
    ]
  },
  "close": {
    "title": "Separate a CRM record import from a complete sales history",
    "checkedAt": "2026-09-30",
    "contentUpdatedAt": "2026-09-30",
    "scope": "Pre-purchase checks for importing into Close and keeping an exit path.",
    "checks": [
      {
        "title": "Inventory activities separately from leads",
        "documentedBoundary": "Close documents separate support tools for notes, tasks and call activities that its built-in lead importer does not cover. These tools require an API key.",
        "buyerAction": "List the record types and historical timestamps your team needs. Keep API keys inside approved vendor tools; never paste them into a comparison site.",
        "sourceIds": [
          "other-data"
        ]
      },
      {
        "title": "Test whether the exit file includes the conversation",
        "documentedBoundary": "In the built-in Close export, JSON is the format that includes all activities; CSV is intended for exports without activity data. Separate support tools exist for other export needs.",
        "buyerAction": "Export a sample lead with notes and messages, then inspect what the replacement can actually import. An available export is not automatic migration compatibility.",
        "sourceIds": [
          "export"
        ]
      },
      {
        "title": "Budget for the workflow, not just the lowest seat price",
        "documentedBoundary": "Close lists automated workflows on Growth and Scale, not Solo or Essentials. Calling and SMS usage are separate from the subscription.",
        "buyerAction": "Run one representative follow-up workflow in the required tier and include expected communications usage in the quote before choosing a plan.",
        "sourceIds": [
          "pricing"
        ]
      }
    ],
    "sources": [
      {
        "id": "other-data",
        "label": "Close activity-import support tools",
        "url": "https://help.close.com/getting-started/import-data-into-close/importing-other-data-into-close"
      },
      {
        "id": "export",
        "label": "Close export formats and activity coverage",
        "url": "https://help.close.com/account-management/exporting-data"
      },
      {
        "id": "pricing",
        "label": "Close plan and usage boundaries",
        "url": "https://close.com/pricing"
      }
    ]
  },
  "setmore": {
    "title": "Will Free cover the real booking workflow?",
    "checkedAt": "2026-09-30",
    "contentUpdatedAt": "2026-09-30",
    "scope": "Plan selection for staff calendars, reminders and customer continuity.",
    "checks": [
      {
        "title": "Count calendars, not only people who log in",
        "documentedBoundary": "Setmore counts each staff calendar as a user even without login permission. Free is limited to four users; Pro is priced per user.",
        "buyerAction": "Write down every staff calendar required for booking before comparing Free with a per-user paid quote.",
        "sourceIds": [
          "pricing"
        ]
      },
      {
        "title": "Check sync and reminder boundaries",
        "documentedBoundary": "Two-way calendar sync and recurring appointments require Pro. Pro lists 500 monthly SMS credits per team member; additional credits can be purchased and availability varies by country.",
        "buyerAction": "Test a booking and reschedule against the calendars you already use, then check reminder destinations and expected volume.",
        "sourceIds": [
          "pricing"
        ]
      },
      {
        "title": "Keep contacts separate from appointment continuity",
        "documentedBoundary": "Setmore lists contact import/export on both Free and Pro. That entry is not a promise that a full historical appointment migration is included.",
        "buyerAction": "Before changing the public booking link, confirm how future appointments and customer history will be handled. Keep the old schedule available until the sample reconciles.",
        "sourceIds": [
          "pricing"
        ]
      }
    ],
    "sources": [
      {
        "id": "pricing",
        "label": "Setmore user, sync, SMS and import boundaries",
        "url": "https://www.setmore.com/pricing"
      }
    ]
  }
};

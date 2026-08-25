import { getPartnerMoneyMatrix } from "@/data/affiliate/money-matrix";

console.table(getPartnerMoneyMatrix().map((row) => ({
  partner: row.partner,
  status: row.status,
  url: row.url ?? "MISSING",
  coverage: `hub + ${row.coverage.comparisonRoutes} comparisons`,
  cta: row.cta,
  tracking: row.tracking,
  disclosure: row.disclosure,
  technicalPathReady: row.technicalPathReady,
  payoutReadiness: row.payoutReadiness,
  revenueReady: row.revenueReady,
  blocker: row.blocker ?? "none",
  nextAction: row.nextAction,
})));

import type { AffiliateRevenueReport } from "./affiliate-revenue-agent";
import type { Opportunity } from "./contracts";
import type { ActionItem, DirectorReport, OwnerDecision } from "./director";
import { valueOf } from "./evidence";
import type { GoogleRecoveryReport, PropertyWindowSummary } from "./google-recovery-agent";
import type { GuardianReason, GuardianReport } from "./guardian";
import { pathOf } from "./urls";

/**
 * Hebrew progress report for the owner. Deterministic: every sentence is a
 * template filled from the structured reports, so the same evidence always
 * reads the same way. Identifiers (URLs, status codes, command names) stay in
 * Latin script on purpose; they are what the owner would search for.
 */

const num = (value: number | null | undefined): string => (value === null || value === undefined ? "לא ידוע" : value.toLocaleString("en-US"));

/** How the impressions-per-day rate moved between the two property windows, or "" when either rate is unknown. */
function rateChangeHe(historical: PropertyWindowSummary | null, recent: PropertyWindowSummary | null): string {
  const before = historical?.impressionsPerObservedDay;
  const now = recent?.impressionsPerObservedDay;
  if (before === null || before === undefined || now === null || now === undefined) return "";
  if (before === 0) return ` קצב החשיפות ליום: ${num(now)}.`;
  const change = Math.round(((now - before) / before) * 1000) / 10;
  if (change === 0) return ` קצב החשיפות ליום לא השתנה (${num(now)}).`;
  return ` קצב החשיפות ליום ${change < 0 ? "ירד" : "עלה"} מ-${num(before)} ל-${num(now)} (${Math.abs(change)}%).`;
}

const CAPTURE_HE: Record<string, string> = {
  "ui-table-capture": "נתוני Search Console נקראו מהחשבון המחובר של הבעלים כטבלאות ולא כקובץ ייצוא. מספרי השורות והסכומים נבדקו מול כותרות הדוחות.",
  "ui-export-csv": "נתוני Search Console יובאו מקובץ ייצוא שהבעלים הוריד; המניפסט מתעד את החלון והמסננים.",
  api: "נתוני Search Console נקראו דרך ה-API; המניפסט מתעד את החלון והמסננים.",
};

/** Hebrew "and": a bare vav before a word, "ו-" before a numeral. */
export const andHe = (text: string): string => (/^\d/.test(text) ? `ו-${text}` : `ו${text}`);

/** Counted nouns: singular form for one, "unknown" in the right gender for a value that was not measured. */
const counted = (n: number | null | undefined, one: string, many: string, unknown: string): string => (n === null || n === undefined ? unknown : n === 1 ? one : `${num(n)} ${many}`);

export const he = {
  impressions: (n: number | null | undefined): string => counted(n, "חשיפה אחת", "חשיפות", "חשיפות לא ידועות"),
  clicks: (n: number | null | undefined): string => counted(n, "קליק אחד", "קליקים", "קליקים לא ידועים"),
  pages: (n: number | null | undefined): string => counted(n, "דף אחד", "דפים", "דפים לא ידועים"),
  urls: (n: number | null | undefined): string => counted(n, "כתובת אחת", "כתובות", "כתובות לא ידועות"),
  days: (n: number | null | undefined): string => counted(n, "יום אחד", "ימים", "ימים לא ידועים"),
  partners: (n: number | null | undefined): string => counted(n, "שותף אחד", "שותפים", "שותפים לא ידועים"),
};

const PROTECTION_HE: Record<string, string> = {
  EDITABLE: "ניתן לעריכה",
  PROTECTED: "מוגן (ניסוי או מחזור מדידה)",
  OBSERVATION_WINDOW: "בחלון מדידה",
  IN_FLIGHT: "בעבודה פעילה בעץ עבודה אחר",
  UNKNOWN: "הגנה לא ידועה",
};

const DEMAND_HE: Record<string, string> = {
  CURRENT_VERIFIED: "ביקוש נוכחי מאומת",
  CURRENT_TRACE: "עקבות ביקוש נוכחי בלבד",
  HISTORICAL_ONLY: "ביקוש היסטורי בלבד",
  NO_MEASURED_DEMAND: "לא נמדד ביקוש",
  UNKNOWN: "ביקוש לא ידוע",
};

const PAYOUT_HE: Record<string, string> = { ALL_VERIFIED: "תשלום מאומת", SOME_UNVERIFIED: "תשלום מאומת חלקית", NONE_VERIFIED: "תשלום לא מאומת", NOT_APPLICABLE: "" };
const READINESS_HE: Record<string, string> = { OWNER_ACTION_REQUIRED: "נדרשת פעולה שלך", UNVERIFIED: "לא מאומת", VERIFIED: "מאומת" };
const GATE_HE: Record<string, string> = { audit: "אבטחת תלויות (npm audit)", tests: "בדיקות", "validate-data": "תקינות נתונים", lint: "lint", typecheck: "בדיקת טיפוסים", build: "בנייה" };
const VERDICT_HE: Record<string, string> = {
  RELEASE_ALLOWED: "שחרור מותר מבחינת השערים (השומר עצמו לעולם לא מפרסם)",
  RELEASE_BLOCKED: "שחרור חסום",
  NOT_VERIFIED: "לא ניתן לאמת, שער אחד לפחות לא הורץ",
};

/** Ledger statuses a product without an active partner can carry, in plain words. An unknown status is shown as it is. */
const PROGRAM_STATUS_HE: Record<string, string> = {
  OWNER_ACTION_REQUIRED: "נדרשת פעולה שלך",
  PENDING_REVIEW: "ממתין להחלטת התוכנית",
  PROGRAM_NOT_VERIFIED: "התוכנית לא אומתה",
  NO_REAL_PROGRAM_FOUND: "לא נמצאה תוכנית",
  REJECTED: "נדחה",
  ACTIVE: "פעיל",
};

const OPEN_BLOCKER_HE: Record<string, string> = {
  LIVE_TECHNICAL_NOT_CHECKED: "תגובת הדף החי לא נבדקה",
  LIVE_TECHNICAL_DEFECT: "יש פגם טכני בדף החי",
  GOOGLE_COVERAGE_NOT_CHECKED: "מצב הכיסוי בגוגל לא נקרא",
  BUYER_INTENT_NOT_CONFIRMED: "כוונת הקנייה לא אומתה",
  CONTENT_GAP_NOT_CONFIRMED: "פער התוכן לא אומת מול מקור הספק",
  DERIVED_PAGE_BLOCKED: "שינוי ברשומה ישפיע גם על דפים מוגנים או במדידה",
  MONETIZATION_NOT_VERIFIED: "נתיב ההכנסה לא אומת",
  RECENT_DEMAND_NOT_VERIFIED: "הביקוש הנוכחי לא אומת",
  NOT_PUBLISHED_BY_CODE: "הקוד הנוכחי לא מפרסם את הדף",
  NO_POSITIVE_DEMAND_LOSS: "לא נמדדה ירידה בביקוש",
  PROTECTION_UNKNOWN: "מקור הגנה אחד לא נקרא",
};

/** What is still open on the page, beyond what the verdict, the partner and the action already say. Each item is a blocker code with a Hebrew name. */
function openBlockersHe(o: Opportunity): string {
  const labels = [...new Set(o.blockers.map((b) => OPEN_BLOCKER_HE[b.code]).filter((label): label is string => Boolean(label)))];
  return labels.length > 0 ? `; עדיין פתוח: ${labels.join(", ")}` : "";
}

/** A hold that the verdict's precedence hides: another worktree also has unfinished work on the page. */
function alsoInFlightHe(o: Opportunity): string {
  return o.protection.verdict !== "IN_FLIGHT" && o.protection.reasons.some((reason) => reason.startsWith("in-flight-work:")) ? "; ובנוסף יש עבודה לא גמורה על הדף בעץ עבודה אחר" : "";
}

function actionHe(kind: Opportunity["recommendedAction"]["kind"], eligibleAfter: string | null): string {
  switch (kind) {
    case "HANDOFF_TO_PAGE_UPGRADER":
      return "להעביר ל-miloosh-money-page-upgrader";
    case "COLLECT_EVIDENCE":
      return "לאסוף ראיות בקריאה בלבד";
    case "WAIT_FOR_OBSERVATION":
      return `להמתין ולא לערוך${eligibleAfter ? ` עד ${eligibleAfter}` : ""}`;
    case "OWNER_DECISION":
      return "החלטת בעלים";
    case "TECHNICAL_TRIAGE":
      return "בדיקה טכנית";
    default:
      return "אין פעולה";
  }
}

function recentHe(o: Opportunity): string {
  const recent = o.demand.recent;
  if (recent.state === "MEASURED") return he.impressions(recent.impressions);
  if (recent.state === "ZERO_BY_COMPLETE_TABLE" || recent.state === "ZERO_BY_EXACT_PAGE_CHECK") return "אפס חשיפות (נבדק)";
  return "לא נצפה";
}

function partnerHe(o: Opportunity): string {
  if (o.affiliate.relationship === "ACTIVE_PARTNER") {
    const alt = new Set(o.affiliate.otherCtaPartnerSlugs);
    const own = o.affiliate.partnerSlugs.filter((slug) => !alt.has(slug));
    const payout = PAYOUT_HE[o.affiliate.payoutReadiness] ?? "";
    if (own.length > 0 && alt.size > 0) return `שותף פעיל בדף (${own.join(", ")}) וגם שותף שמוצג כאפשרות נוספת (${[...alt].join(", ")}) — ${payout}`;
    if (alt.size > 0) return `אין שותף על המוצר עצמו, אבל שותף פעיל מוצג בדף כאפשרות נוספת (${[...alt].join(", ")}) — ${payout}`;
    return `יש שותף פעיל (${own.join(", ")}) — ${payout}`;
  }
  if (o.affiliate.relationship === "NO_ACTIVE_PARTNER") return "אין שותף פעיל (ערך של נראות בלבד)";
  return "לא רלוונטי";
}

/** "the pages that show them drew N impressions on M pages" with the right grammar for zero, one and many; the owner sees demand, never revenue. */
function stakeHe(params: Record<string, string | number | null>, opening: string): string {
  const impressions = Number(params.impressions);
  const pages = Number(params.pages);
  if (!(impressions > 0)) return `${opening} לא נרשמו חשיפות היסטוריות`;
  return `${opening} נרשמו ${he.impressions(impressions)} היסטוריות ${pages === 1 ? "בדף אחד" : `ב-${he.pages(pages)}`}${stakeSplitHe(params)}`;
}

/** "of which X on the partners' own pages and Y on other products' pages that show them", or "" when the split is unknown. */
function stakeSplitHe(params: Record<string, string | number | null>): string {
  const own = params.ownImpressions;
  const alt = params.otherCtaImpressions;
  if (typeof own !== "number" || typeof alt !== "number") return "";
  return ` (מתוכן ${he.impressions(own)} בדפי השותפים עצמם ו-${he.impressions(alt)} בדפים של מוצרים אחרים שמציגים אותם כאפשרות נוספת)`;
}

export function actionTitleHe(item: ActionItem): string {
  const p = item.params;
  switch (item.kind) {
    case "OWNER_PAYOUT_ACTION":
      return `להשלים את הגדרת התשלום בחשבון "${p.railLabel}" (שותפים: ${p.partners})`;
    case "REPAIR_TECHNICAL_PATH":
      return `לתקן את נתיב השותף של ${p.subject ?? "השותף"}`;
    case "RESOLVE_REGISTRY_CONFLICT":
      return `ליישב סתירה בין הרישום הפעיל לספר הכללי עבור ${p.subject ?? "השותף"}`;
    case "MEASURE_FUNNEL":
      return "לקרוא את משפך הנתונים של האתר (לא נקרא בריצה הזו)";
    case "WAIT_FIRST_RECRAWL":
      return "להמתין לסריקה חוזרת ראשונה של גוגל בדפים ששוחררו";
    case "START_REVIEW_CLOCKS":
      return "להתחיל את שעוני הבדיקה של 14 ו-28 ימים";
    case "HANDOFF_TO_PAGE_UPGRADER":
      return `להעביר את ${p.path} לשדרוג עמוד אחד`;
    case "COLLECT_EVIDENCE":
      return `לאסוף ראיות בקריאה בלבד עבור ${p.path}`;
    case "WAIT_FOR_OBSERVATION":
      return `להמתין ולא לערוך את ${p.path}${p.eligibleAfter ? ` עד ${p.eligibleAfter}` : ""}`;
    case "OWNER_DECISION":
      return `החלטת בעלים לגבי ${p.path}`;
    case "RELEASE_GATES":
      return "שערי השחרור";
  }
}

export function actionSummaryHe(item: ActionItem): string {
  const p = item.params;
  switch (item.kind) {
    case "OWNER_PAYOUT_ACTION":
      return `${stakeHe(p, "בדפים שמציגים את השותפים האלה")} (זה ביקוש ולא תחזית הכנסה). כל עוד התשלום לא מאומת, אי אפשר להראות שקליק עליהם מסתיים בעמלה שמשולמת בפועל. זו פעולה של בעל האתר בלבד: אף סוכן לא נכנס לחשבון, לא משנה פרטי תשלום ולא שולח דבר. חבילת הפעולה המוכנה: ${p.packId}.`;
    case "WAIT_FIRST_RECRAWL":
      return `מתוך ${he.urls(Number(p.sampled))} שנדגמו, ${Number(p.crawledAfterRelease)} נסרקו אחרי ההפצה מ-${p.releaseDate} (הסריקה האחרונה שנדגמה: ${p.newestCrawl ?? "לא ידועה"}). שעוני 14/28 הימים מתחילים רק כשנצפית סריקה חוזרת.`;
    case "START_REVIEW_CLOCKS":
      return `${Number(p.crawledAfterRelease)} מתוך ${he.urls(Number(p.sampled))} שנדגמו נסרקו אחרי ההפצה מ-${p.releaseDate}.`;
    case "WAIT_FOR_OBSERVATION":
      return `הדף שונה לאחרונה, וחלון המדידה שלו מגן על הניסוי. לא לערוך לפני ${p.eligibleAfter ?? "תאריך לא ידוע"}; השעון מתחיל בסריקה חוזרת שנצפתה.`;
    case "COLLECT_EVIDENCE":
      return "חסרות ראיות שאפשר לאסוף בקריאה בלבד: בדיקת תגובת הדף החי, מצב הכיסוי של גוגל, שאילתות של הדף ופער תוכן מול מקור הספק.";
    case "OWNER_DECISION":
      return "נשארו רק החלטות שרק הבעלים יכול לקבל לגבי הדף.";
    case "HANDOFF_TO_PAGE_UPGRADER":
      return "כל התנאים התקיימו: אפשר להעביר את הכתובת הזו לשינוי מקומי אחד ומאומת. השחרור נשאר שלב נפרד באישור הבעלים.";
    case "RELEASE_GATES":
      return item.status === "BLOCKED" ? "שערי השחרור אינם ירוקים. הם מדווחים כפי שהם ואף אחד לא עוקף אותם." : "שערי השחרור ירוקים.";
    default:
      return item.summary;
  }
}

export function ownerDecisionHe(d: OwnerDecision): string {
  const p = d.params;
  switch (d.kind) {
    case "PAYOUT_RAIL":
      return `להשלים את הגדרת התשלום ב"${p.railLabel}" (שותפים: ${p.partners}) — מצב: ${READINESS_HE[String(p.readiness)] ?? p.readiness}. ${stakeHe(p, "בדפים שמציגים אותם")}.`;
    case "RELEASE_GATES":
      return "אילו מהתיקונים שעדיין לא אוחדו מותר לשלב כדי ששערי השחרור יעברו? אף סוכן לא ממזג, לא עוקף ולא מוותר על שער.";
    case "CLOSE_EXPERIMENTS":
      return `${he.pages(Number(p.count))} שייכים לרשומות ניסוי שעדיין במצב MEASURING אף שחלון המדידה שלהם הסתיים. לסגור כל אחד כניצחון, כהפסד או כלא חד-משמעי?`;
    case "REGISTRY_CONFLICT":
      return "ליישב סתירה בין הרישום הפעיל לספר הכללי לפני שמפנים תנועה לשותף.";
    case "TECHNICAL_REPAIR":
      return "לתקן את נתיב השותף הטכני לפני שמפנים אליו תנועה.";
  }
}

function guardianReasonHe(reason: GuardianReason): string {
  switch (reason.code) {
    case "GATE_FAILED":
      return `שער ${GATE_HE[reason.gate ?? ""] ?? reason.gate} נכשל`;
    case "GATE_NOT_RUN":
      return `שער ${GATE_HE[reason.gate ?? ""] ?? reason.gate} לא הורץ בריצה הזו`;
    case "DIRTY_WORKTREE":
      return "יש שינויים שלא נשמרו בעץ העבודה הנבדק";
    case "PROTECTED_PAGES_AFFECTED":
      return "השינוי עלול לשנות דפים מוגנים, בחלון מדידה או בעבודה פעילה";
    case "PRODUCTION_LINEAGE_DROPPED":
      return "שחרור הקומיט הזה יסיר עבודה שכבר פורסמה ב-production";
    case "UNRUN_GATES":
      return "שער נדרש אחד לפחות לא הורץ, ולכן אי אפשר לאשר שחרור";
  }
}

export function whyThisFirstHe(report: DirectorReport, first: ActionItem | undefined): string[] {
  const lines: string[] = [];
  if (!first) return lines;
  lines.push("הסדר נקבע בכללים קבועים ולא בציון: קודם עבודה שסוכן יכול לבצע לבד, אחר כך החלטות בעלים, אחר כך פערי ראיות, ואחר כך המתנה. שוויון נשבר לפי ביקוש היסטורי שנמדד, אחר כך תאריך.");
  if (first.lane === "AFFILIATE") lines.push("זו הפעולה היחידה שאפשר לבצע עכשיו ושמשנה את מסלול ההכנסה בלי לגעת בדף שנמצא במדידה ובלי לחכות לגוגל.");
  if (first.historicalImpressionsAtStake !== null) lines.push(`${he.impressions(first.historicalImpressionsAtStake)} היסטוריות נמצאות בדפים שהפעולה נוגעת בהם (הוכחה לביקוש, לא תחזית הכנסה).`);
  if (!report.answer.contentEditsAllowedNow) lines.push("אין דף מדורג שאפשר לערוך בלי לשבש חלון מדידה פעיל או ניסוי מוגן, ולכן שינוי תוכן אינו הפעולה המוגנת ביותר כרגע.");
  return lines;
}

export function renderHebrewReport(report: DirectorReport, google: GoogleRecoveryReport, affiliate: AffiliateRevenueReport, guardian: GuardianReport | null): string {
  const lines: string[] = [];
  const h = google.windows.historical;
  const r = google.windows.recent;
  const first = report.queue.find((item) => item.id === report.answer.actionId);

  lines.push("# דוח מנהל הצמיחה של Miloosh");
  lines.push("");
  lines.push(`נוצר: ${report.generatedAt} · קומיט ${report.checkoutSha.slice(0, 7)} · מצב: קריאה בלבד. לא שונה דף, לא פורסם דבר, לא הוגשה בקשת אינדוקס, לא נשלחה הודעה ולא נגעו בחשבון חיצוני.`);
  lines.push("");
  lines.push("## התשובה הקצרה");
  if (first) {
    lines.push(`**הפעולה המומלצת:** ${actionTitleHe(first)}.`);
    lines.push(actionSummaryHe(first));
    lines.push("");
    lines.push("למה דווקא זו:");
    for (const why of whyThisFirstHe(report, first)) lines.push(`- ${why}`);
  } else {
    lines.push("לא ניתן היה להפיק פעולה מהראיות שסופקו.");
  }
  lines.push("");
  lines.push("## מה מדדנו (OBSERVED)");
  if (h && r) {
    lines.push(`- חלון היסטורי ${h.window.start} עד ${h.window.end}: ${he.impressions(h.impressions)} ${andHe(he.clicks(h.clicks))} בחיפוש גוגל. בפועל היו נתונים רק ב-${he.days(h.observedDays)} מתוך ${he.days(h.windowDays)}.`);
    lines.push(`- חלון נוכחי ${r.window.start} עד ${r.window.end}: ${he.impressions(r.impressions)} ${andHe(he.clicks(r.clicks))}.${rateChangeHe(h, r)}`);
  } else {
    lines.push("- אין נתוני Search Console, ולכן לא חושב שום דירוג והכול מסומן NEEDS_DATA. שום ערך לא הומר לאפס.");
    for (const missing of google.missingInputs.slice(0, 3)) lines.push(`- חסר: ${missing.input}. איך מספקים: ${missing.howToProvide}`);
  }
  if (google.daily?.largestDrop) {
    const d = google.daily.largestDrop;
    lines.push(`- הירידה היומית החדה ביותר בסדרה: ${he.impressions(d.fromImpressions)} ב-${d.from} ל-${he.impressions(d.toImpressions)} ב-${d.to}. זו תצפית על תזמון בלבד ולא קביעת סיבה.`);
  }
  const sm = google.indexation.sitemap ? valueOf(google.indexation.sitemap) : null;
  if (sm) lines.push(`- גוגל קראה את ה-sitemap ב-${sm.lastRead} (${he.urls(sm.discoveredPages)}). אין צורך להגיש אותו שוב.`);
  const cov = google.indexation.coverage ? valueOf(google.indexation.coverage) : null;
  if (cov) lines.push(`- נכון ל-${cov.reportLastUpdated}${google.indexation.coverageReportOlderThanRelease === true ? " (הדוח עודכן לפני ההפצה האחרונה ולכן אינו משקף אותה)" : ""}: ${he.pages(cov.indexed)} באינדקס ${andHe(he.pages(cov.notIndexed))} לא באינדקס.`);
  if (google.indexation.postReleaseCrawl) {
    const p = google.indexation.postReleaseCrawl;
    lines.push(`- מתוך ${he.urls(p.sampled)} שנדגמו, ${p.crawledAfterRelease} נסרקו אחרי ההפצה מ-${p.releaseDate}. שעוני 14/28 הימים מתחילים רק מסריקה חוזרת שנצפתה.`);
  }
  if (google.protectionSummary) {
    const v = google.protectionSummary.verdicts;
    lines.push(`- מתוך ${he.pages(google.protectionSummary.pagesChecked)} שגוגל הציגה בחלון ההיסטורי: ${he.pages(v.EDITABLE)} ${v.EDITABLE === 1 ? "ניתן" : "ניתנים"} לעריכה, ${he.pages(v.PROTECTED)} ${v.PROTECTED === 1 ? "מוגן" : "מוגנים"} (ניסוי), ${he.pages(v.OBSERVATION_WINDOW)} בחלון מדידה, ${he.pages(v.IN_FLIGHT)} בעבודה פעילה בעץ אחר${v.UNKNOWN > 0 ? `, ${he.pages(v.UNKNOWN)} עם הגנה לא ידועה` : ""}.`);
  }
  lines.push(`- ביקוש נוכחי מאומת: ${he.pages(report.demandSummary.verifiedCurrentDemandPages)} מבין הדפים שדורגו. ביקוש היסטורי: ${he.pages(report.demandSummary.historicalDemandPages)}. ביקוש משוער (השערה): אפס, ולא הומצא.`);
  lines.push("");
  lines.push("## הכסף והשותפים");
  lines.push(`- ${he.partners(affiliate.counts.activePartners)} פעילים, ${affiliate.counts.issuedLinks} עם קישור אישי מונפק, ${affiliate.counts.technicalPathReady} עם נתיב טכני תקין, ${affiliate.counts.revenueReady} מוכנים להכנסה מקצה לקצה (קישור ותשלום מאומת).`);
  lines.push(`- תשלום מאומת: ${affiliate.counts.payoutVerified}. דורש פעולת בעלים: ${affiliate.counts.payoutOwnerActionRequired}. לא מאומת: ${affiliate.counts.payoutUnverified}.`);
  if (affiliate.commercialPaths) {
    const c = affiliate.commercialPaths;
    lines.push(`- מתוך ${num(c.comparisonsTotal)} השוואות באתר: ${num(c.comparisonsWithActivePartnerOnOneSide)} עם שותף פעיל בצד אחד, ${num(c.comparisonsWithActivePartnerOnBothSides)} בשני הצדדים; ${num(c.monetizedComparisonsInSitemap)} מהן נמצאות ב-sitemap לפי הקוד.`);
  }
  if (affiliate.nonPartnerDemand.length > 0) {
    const shown = affiliate.nonPartnerDemand.slice(0, 5).map((row) => `${pathOf(row.url)} (${he.impressions(row.historicalImpressions)}; תוכנית: ${row.programStatus ? (PROGRAM_STATUS_HE[row.programStatus] ?? row.programStatus) : "לא רשומה"})`);
    lines.push(`- ביקוש היסטורי בדפים שהמוצר שלהם אינו שותף פעיל (החמישה הגדולים, לבדיקת תוכנית שותפים בלבד; אין לקדם אותם כשותפים): ${shown.join(", ")}.`);
  }
  lines.push("- המרות, עמלות מאושרות ותשלומים שהתקבלו: NOT_MEASURED. אין מקור נתונים כזה בריפו, והם לא נספרים כאפס.");
  lines.push(`- משפך האתר (סשנים אנושיים וקליקים מוסמכים): ${valueOf(affiliate.funnel) ? "נקרא" : "UNAVAILABLE בריצה הזו — לא נקרא ולא הוחלף באפס"}.`);
  lines.push("");
  lines.push("## חמש ההזדמנויות המובילות");
  lines.push(`כלל הבחירה: דף נכנס רק אם הקוד הנוכחי מפרסם אותו, יש לו דרך לפעולה (ניתן לעריכה, או בחלון מדידה עם תאריך סיום) ולפחות ${google.config.minHistoricalImpressions} חשיפות היסטוריות שנמדדו. קודם דפים עם נתיב הכנסה מאומת (קישור שותף למוצר עצמו או למוצר אחר שהדף מציג), אחר כך לפי יותר חשיפות היסטוריות. אם אפשר לערוך עכשיו או רק אחרי חלון המדידה נאמר בכל שורה ואינו משנה את הסדר. אין ציון מספרי.`);
  report.shortlist.forEach((o, i) => {
    lines.push(`${i + 1}. ${pathOf(o.targetUrl)} — ${he.impressions(o.demand.historical.impressions)} היסטוריות${o.demand.historical.position ? ` (מיקום ממוצע ${o.demand.historical.position})` : ""}; כעת: ${recentHe(o)} — ${DEMAND_HE[o.demand.class]}; ${PROTECTION_HE[o.protection.verdict]}${o.protection.eligibleAfter ? ` עד ${o.protection.eligibleAfter}` : ""}${alsoInFlightHe(o)}; ${partnerHe(o)}${openBlockersHe(o)}; הפעולה: ${actionHe(o.recommendedAction.kind, o.protection.eligibleAfter)}.`);
  });
  if (report.shortlist.length === 0) lines.push("- אין דף שעומד בכלל הבחירה.");
  lines.push("");
  lines.push("## דפים שאסור לגעת בהם עכשיו (מדידה בלבד)");
  for (const held of report.heldPages.slice(0, 6)) lines.push(`- ${pathOf(held.url)} — ${he.impressions(held.historicalImpressions)} היסטוריות · ${PROTECTION_HE[held.verdict] ?? held.verdict}${held.hasActivePartner ? " · יש שותף פעיל" : ""}`);
  lines.push("");
  lines.push("## החלטות שמחכות לבעלים");
  if (report.ownerDecisions.length === 0) lines.push("- אין.");
  for (const d of report.ownerDecisions) lines.push(`- ${ownerDecisionHe(d)}`);
  lines.push("");
  lines.push("## שערי שחרור");
  if (guardian) {
    lines.push(`- פסק הדין של השומר: ${VERDICT_HE[guardian.verdict]}.`);
    for (const reason of guardian.reasons) lines.push(`- ${guardianReasonHe(reason)}.`);
  } else {
    lines.push("- השומר לא הורץ, ולכן בטיחות השחרור NOT_VERIFIED.");
  }
  lines.push("");
  lines.push("## מה לא לעשות");
  lines.push("- לא לערוך שום דף שנמצא בחלון מדידה או בניסוי מוגן.");
  lines.push(
    sm
      ? `- לא לבקש אינדוקס ולא להגיש שוב את ה-sitemap: גוגל קראה אותו ב-${sm.lastRead}, וכלל איכות האינדוקס של הבעלים אוסר בקשות המוניות.`
      : "- לא לבקש אינדוקס בצורה המונית ולא להגיש את ה-sitemap שוב ושוב: כלל איכות האינדוקס של הבעלים אוסר בקשות המוניות.",
  );
  lines.push("- לא לפרסם, לא למזג ולא לוותר על שער שחרור. השומר מדווח והבעלים מחליט.");
  lines.push("- לא להתייחס לחשיפות היסטוריות כאל ביקוש נוכחי או כאל הכנסה.");
  lines.push("");
  lines.push("## מגבלות");
  lines.push(`- ${google.windows.capturedVia ? CAPTURE_HE[google.windows.capturedVia] : "לא נקרא שום נתון מ-Search Console בריצה הזו."}`);
  lines.push("- Search Console לא מציג תאריך נתונים סופי. כלל שלושת הימים הוא הנחה שמשותפת לעוזר התאריכים של הריפו.");
  lines.push(
    google.cannibalization.pageQueryTablesCaptured > 0
      ? `- שאילתות נלכדו רק עבור ${he.pages(google.cannibalization.pageQueryTablesCaptured)}, ולכן חפיפת דפים (cannibalization) נשארת NOT_MEASURED באתר כולו. אין נתון על קושי מילת מפתח או Domain Rating, ולכן לא נטען שום דבר על תחרות נמוכה.`
      : "- לא נלכדו שורות של שאילתה לפי דף, ולכן חפיפת דפים (cannibalization) היא NOT_MEASURED. אין נתון על קושי מילת מפתח או Domain Rating, ולכן לא נטען שום דבר על תחרות נמוכה.",
  );
  return `${lines.join("\n")}\n`;
}

import { renderedHtml } from "@/lib/seo/rendered-html";
import { canonicalCohortPage } from "./cohorts";
export function verifyRecordedTitle(change: { url: string; after: { title: string } }, html: Map<string, string>) {
  const canonical = canonicalCohortPage(change.url);
  const actualTitle = html.has(canonical) ? renderedHtml(html.get(canonical)!).title : null;
  return { reportedUrl: change.url, canonical, reportedRouteEmitted: html.has(change.url),
    actualTitle, expectedTitle: change.after.title,
    status: actualTitle?.startsWith(change.after.title) ? "EXPECTED_TITLE_RENDERED" : "EXPECTED_TITLE_NOT_RENDERED",
    note: "Local build verification only; a receipt/commit is not proof that the intended title renders or was deployed" };
}

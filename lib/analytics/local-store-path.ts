import path from "node:path";

/** Test isolation never changes the production/local operational store. */
export function analyticsLocalPath(file: "first-party-analytics.json" | "outbound-clicks.json"): string {
  const testDirectory = process.env.NODE_ENV === "test" && process.env.MILOOSH_ANALYTICS_TEST_DIR;
  return path.join(testDirectory || path.join(process.cwd(), "var"), file);
}

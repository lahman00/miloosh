/** Explicit production opt-in; never permit QA traffic to merchants or stores. */
export function assertQaOrigin(origin: string, productionReadOnly = false) {
  const u = new URL(origin);
  if (u.username || u.password || u.search || u.hash || u.pathname !== "/") throw new Error("Unsupported QA origin");
  if (["127.0.0.1", "localhost"].includes(u.hostname) && u.protocol === "http:") return;
  if (productionReadOnly && u.origin === "https://miloosh.com") return;
  throw new Error("Production QA requires explicit read-only opt-in");
}
export function qaRequestAction(origin: string, url: string, method: string) {
  const u = new URL(url);
  if (u.origin !== origin || u.pathname.startsWith("/internal/")) return "BLOCK";
  if (u.pathname.startsWith("/api/")) return "MOCK";
  return method === "GET" ? "READ" : "BLOCK";
}

export const BUYER_DESK_KEY = "miloosh-buyer-desk-v1";
export const DESK_CATEGORIES = [
  { id: "crm", name: "CRM & sales", slugs: ["pipedrive", "close", "nutshell"] },
  { id: "work", name: "Projects & work", slugs: ["todoist", "clickup", "airtable"] },
  { id: "email", name: "Email marketing", slugs: ["mailerlite", "moosend", "brevo"] },
] as const;
export type DeskCategory = typeof DESK_CATEGORIES[number]["id"];
export type DeskIntent = "new" | "switch" | "compare";
export type DeskProduct = {
  slug: string; name: string; category: DeskCategory; description: string;
  bestFor: string; features: string[]; limitation: string; checkedAt: string;
};
export type DeskContext = { intent: DeskIntent; team: string; current: string; concern: string; note: string };
export type DeskState = { saved: string[]; category: DeskCategory; contexts: Partial<Record<DeskCategory, DeskContext>> };
export const emptyDesk = (): DeskState => ({ saved: [], category: "crm", contexts: {} });
export const hasDeskResearch = (state: DeskState) => state.saved.length > 0 || Object.keys(state.contexts).length > 0;
export const deskCategory = (id: unknown): DeskCategory => DESK_CATEGORIES.find(c => c.id === id)?.id ?? "crm";
export const productCategory = (slug: string) => DESK_CATEGORIES.find(c => (c.slugs as readonly string[]).includes(slug))?.id;
const clean = (text: unknown) => typeof text === "string" ? text.trim().slice(0, 180) : "";
export function cleanContext(input: Partial<DeskContext>): DeskContext {
  const intent = input.intent === "switch" || input.intent === "compare" ? input.intent : "new";
  return { intent, team: intent === "new" ? clean(input.team) : "", current: intent === "switch" ? clean(input.current) : "", concern: clean(input.concern), note: clean(input.note) };
}
export function cleanSaved(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.filter((v): v is string => typeof v === "string" && !!productCategory(v)))].slice(0, 9) : [];
}
export function parseDesk(raw: string | null): DeskState {
  try {
    if (!raw || raw.length > 8192) return emptyDesk();
    const input = JSON.parse(raw);
    const contexts: DeskState["contexts"] = {};
    for (const category of DESK_CATEGORIES) {
      const context = input?.contexts?.[category.id];
      if (context && typeof context === "object" && !Array.isArray(context)) contexts[category.id] = cleanContext(context);
    }
    return { saved: cleanSaved(input?.saved), category: deskCategory(input?.category), contexts };
  } catch { return emptyDesk(); }
}
export const categorySaved = (saved: string[], category: DeskCategory) => cleanSaved(saved).filter(slug => productCategory(slug) === category);
export const toggleDeskProduct = (saved: string[], slug: string) => cleanSaved(saved.includes(slug) ? saved.filter(s => s !== slug) : [...saved, slug]);
export function validateDeskPair(first: string, second: string) {
  if (!productCategory(first) || !productCategory(second)) return "Choose two tools from the starting points below.";
  if (first === second) return "Choose two different tools to compare.";
  if (productCategory(first) !== productCategory(second)) return "Choose two tools from the same list.";
  return "";
}
export const addDeskPair = (saved: string[], first: string, second: string) => validateDeskPair(first, second) ? cleanSaved(saved) : cleanSaved([...saved, first, second]);
export const deskMotionAllowed = (paused: boolean, reduced: boolean, visible: boolean, inView: boolean) => !paused && !reduced && visible && inView;
export function makeDeskBrief(state: DeskState, products: DeskProduct[]): string {
  const picks = categorySaved(state.saved, state.category).flatMap(slug => products.filter(p => p.slug === slug));
  const context = state.contexts[state.category];
  return ["MILOOSH — MY DECISION BRIEF", "Research shortlist, not a personalized buying recommendation.", "",
    `Category: ${DESK_CATEGORIES.find(c => c.id === state.category)?.name}`,
    `Situation: ${context ? { new: "Finding a new tool", switch: "Replacing a tool", compare: "Comparing options" }[context.intent] : "Not specified"}`,
    `Team: ${context?.team || "Not specified"}`, `Current tool: ${context?.current || "Not specified"}`,
    `Main concern: ${context?.concern || "Not specified"}`, `My non-negotiable: ${context?.note || "Not specified"}`, "", "MY SHORTLIST",
    ...picks.flatMap(p => [p.name, `Documented fit: ${p.bestFor}`, `Limitation: ${p.limitation}`, `Research: https://miloosh.com/software/${p.slug}`, `Source check recorded: ${p.checkedAt}`, ""]),
    "BEFORE COMMITTING", "Confirm your required plan, current total cost and usage limits. Test a real workflow and verify imports, exports and cancellation terms. Research dates are not a fresh vendor quote.",
  ].join("\n");
}

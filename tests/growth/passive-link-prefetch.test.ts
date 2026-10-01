import { readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/** Read the actual JSX AST: whitespace or formatting must not bypass the policy. */
function linkPolicies(source: string) {
  const file = ts.createSourceFile("fixture.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const links: { hasHref: boolean; passive: boolean }[] = [];
  const visit = (node: ts.Node) => {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(file) === "Link") {
      const attributes = node.attributes.properties;
      const prefetch = attributes.find((a): a is ts.JsxAttribute => ts.isJsxAttribute(a) && a.name.getText(file) === "prefetch");
      const expression = prefetch?.initializer;
      links.push({
        hasHref: attributes.some(a => ts.isJsxAttribute(a) && a.name.getText(file) === "href"),
        passive: Boolean(expression && ts.isJsxExpression(expression) && expression.expression?.kind === ts.SyntaxKind.FalseKeyword),
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return links;
}

describe("passive editorial link loading", () => {
  it.each([
    ["components/SoftwareCard.tsx", 1],
    ["components/CategoryCard.tsx", 1],
    ["components/CompareGrid.tsx", 1],
    ["components/Footer.tsx", 3],
  ] as const)("%s retains hrefs but does not eagerly prefetch on viewport or hover", (path, expected) => {
    const links = linkPolicies(readFileSync(path, "utf8"));
    expect(links).toHaveLength(expected);
    expect(links.every(link => link.hasHref && link.passive)).toBe(true);
  });

  it("recognizes an explicit false boolean without changing the anchor destination", () => {
    expect(linkPolicies('<Link href="/software/close" prefetch={false}>Close</Link>')).toEqual([{ hasHref: true, passive: true }]);
  });

  it.each([
    '<Link href="/software/close">Close</Link>',
    '<Link href="/software/close" prefetch={true}>Close</Link>',
    '<Link href="/software/close" prefetch="false">Close</Link>',
  ])("does not mistake default, true or string props for disabled prefetch", source => {
    expect(linkPolicies(source)[0]?.passive).toBe(false);
  });
});

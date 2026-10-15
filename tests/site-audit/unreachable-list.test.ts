import { describe, expect, it } from "vitest";
import { GENERATED_BEGIN, GENERATED_END, readGeneratedSlugs, renderGeneratedBlock, replaceGeneratedBlock } from "@/lib/site-audit/unreachable-list";

const source = `// header the generator must not touch
export const LIST: readonly string[] = [
${GENERATED_BEGIN}
  "old-vs-pair",
${GENERATED_END}
];
export const AFTER = true;
`;

describe("renderGeneratedBlock", () => {
  it("sorts, de-duplicates and quotes the slugs between the two markers", () => {
    expect(renderGeneratedBlock(["b-vs-c", "a-vs-b", "b-vs-c"])).toBe(`${GENERATED_BEGIN}\n  "a-vs-b",\n  "b-vs-c",\n${GENERATED_END}`);
  });

  it("refuses anything that is not a lower-case slug, so a stray value cannot break the file", () => {
    expect(() => renderGeneratedBlock(['a-vs-b", "x'])).toThrow(/Not a comparison slug/);
    expect(() => renderGeneratedBlock(["A-vs-B"])).toThrow(/Not a comparison slug/);
    expect(() => renderGeneratedBlock(["a/b"])).toThrow(/Not a comparison slug/);
  });
});

describe("replaceGeneratedBlock", () => {
  it("replaces only what lies between the markers", () => {
    const next = replaceGeneratedBlock(source, ["new-vs-pair", "another-vs-pair"]);
    expect(next).toBe(`// header the generator must not touch\nexport const LIST: readonly string[] = [\n${GENERATED_BEGIN}\n  "another-vs-pair",\n  "new-vs-pair",\n${GENERATED_END}\n];\nexport const AFTER = true;\n`);
  });

  it("is idempotent", () => {
    const once = replaceGeneratedBlock(source, ["x-vs-y"]);
    expect(replaceGeneratedBlock(once, ["x-vs-y"])).toBe(once);
  });

  it("can empty the block", () => {
    expect(readGeneratedSlugs(replaceGeneratedBlock(source, []))).toEqual([]);
  });

  it("throws when a marker is missing or they are out of order, rather than writing a broken file", () => {
    expect(() => replaceGeneratedBlock("export const LIST = [];\n", ["a-vs-b"])).toThrow(/markers/);
    expect(() => replaceGeneratedBlock(`${GENERATED_END}\n${GENERATED_BEGIN}\n`, ["a-vs-b"])).toThrow(/markers/);
  });
});

describe("readGeneratedSlugs", () => {
  it("reads the slugs inside the block and nothing outside it", () => {
    expect(readGeneratedSlugs(`  "outside-vs-block",\n${source}`)).toEqual(["old-vs-pair"]);
  });
});

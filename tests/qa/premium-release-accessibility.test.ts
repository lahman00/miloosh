import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { BUYER_PAIN_WAVE2_BRIEFS } from "@/data/guides/buyer-pain-wave2-briefs";
import { getRoleGuide } from "@/data/guides/registry";

function relativeLuminance(hex: string) {
  const channels = hex
    .replace("#", "")
    .match(/.{2}/g)!
    .map(value => Number.parseInt(value, 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(foreground: string, background: string) {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

describe("premium release QA regressions", () => {
  it("keeps the light-theme legacy text tokens above WCAG AA on the relevant light surfaces", () => {
    const css = readFileSync("app/globals.css", "utf8");
    const subtle = css.match(/--subtle:\s*(#[0-9a-f]{6})/i)?.[1];
    const zinc600 = css.match(/--color-zinc-600:\s*(#[0-9a-f]{6})/i)?.[1];
    expect(subtle).toBeTruthy();
    expect(zinc600).toBeTruthy();

    for (const background of ["#f8f9f4", "#eef1e7", "#edefea", "#f1f3ee"]) {
      expect(contrast(subtle!, background)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(zinc600!, background)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("uses supported landmarks and ARIA on the newly QA'd public surfaces", () => {
    const shortlist = readFileSync("components/ShortlistDemo.tsx", "utf8");
    const footer = readFileSync("components/Footer.tsx", "utf8");
    const moneyLayout = readFileSync("app/software/[slug]/layout.tsx", "utf8");
    expect(shortlist).toContain('className="shortlist-tabs" role="group" aria-label="Explore software by need"');
    expect(footer).not.toContain('<h3 className="text-xs font-semibold text-zinc-400">{title}</h3>');
    expect(moneyLayout).toContain('<aside aria-label="Decision shortcut"');
  });

  it("does not reintroduce low-contrast alpha amber on public pricing surfaces", () => {
    const pricing = readFileSync("components/PricingSection.tsx", "utf8");
    const calculator = readFileSync("components/tools/SaasCostCalculator.tsx", "utf8");
    expect(pricing).not.toContain("text-amber-300/80");
    expect(calculator).not.toContain("text-amber-300/80");
  });

  it("does not claim undocumented hands-on testing in the freelancer time-tracking search snippet", () => {
    const guide = getRoleGuide("best-time-tracking-for-freelancers");
    expect(guide?.metaDescription).not.toMatch(/tested|hands-on/i);
    expect(guide?.metaDescription).toContain("documented workflow fit");
  });

  it("uses a live Make Help Center source for the automation guide", () => {
    const brief = BUYER_PAIN_WAVE2_BRIEFS["best-automation-software-for-small-business"];
    const makeSource = brief.sources.find(source => source.id === "make-features");
    expect(makeSource?.url).toBe("https://help.make.com/credits");
    expect(JSON.stringify(brief)).not.toContain("https://help.make.com/how-features-use-credits");
  });
});

import { describe, expect, it } from "vitest";
import { redactDeep, redactText } from "@/lib/growth-agents/redact";

describe("redaction keeps reports safe for a public repository", () => {
  it("removes email addresses", () => {
    expect(redactText("Contact owner@example.com or Eyal.H+x@mail.co.il now")).toBe("Contact <email-redacted> or <email-redacted> now");
  });

  it("keeps Miloosh page URLs and removes every other URL, including tracking and referral links", () => {
    const text = "See https://miloosh.com/software/alpha and https://www.miloosh.com/compare/a-vs-b but not https://partner.example/r/abc?ref=eyal or http://go.example/x";
    expect(redactText(text)).toBe("See https://miloosh.com/software/alpha and https://www.miloosh.com/compare/a-vs-b but not <url-redacted> or <url-redacted>");
  });

  it("does not trust a URL that merely contains miloosh.com", () => {
    expect(redactText("https://miloosh.com.evil.example/x")).toBe("<url-redacted>");
    expect(redactText("https://evil.example/?u=https://miloosh.com/x")).toBe("<url-redacted>");
  });

  it("redacts nested strings in objects and arrays and leaves numbers and nulls alone", () => {
    const value = { a: ["x@y.zz", 3, null], b: { c: "https://p.example/aff?id=1", d: "ok" } };
    expect(redactDeep(value)).toEqual({ a: ["<email-redacted>", 3, null], b: { c: "<url-redacted>", d: "ok" } });
  });

  it("does not mutate its input", () => {
    const value = { a: "x@y.zz" };
    redactDeep(value);
    expect(value.a).toBe("x@y.zz");
  });
});

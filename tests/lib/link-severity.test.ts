import { describe, expect, it } from "vitest";
import { severityForOutcome } from "@/scripts/maintenance/links";

describe("maintenance link severity", () => {
  it("keeps definitive broken references critical", () => {
    expect(severityForOutcome("not_found")).toBe("critical");
    expect(severityForOutcome("gone")).toBe("critical");
    expect(severityForOutcome("invalid_url")).toBe("critical");
  });

  it("does not call transient reachability failures definitive breakage", () => {
    expect(severityForOutcome("timeout")).toBe("warning");
    expect(severityForOutcome("connection_failure")).toBe("warning");
    expect(severityForOutcome("bot_blocked")).toBe("warning");
    expect(severityForOutcome("server_error")).toBe("warning");
  });
});

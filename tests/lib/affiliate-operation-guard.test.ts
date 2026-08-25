import { describe, expect, it } from "vitest";
import { affiliatePipelineOperationBlockReason } from "@/lib/revenue/affiliate-operation-guard";

describe("affiliate pipeline operation guard", () => {
  it("blocks acquisition writes for an already-active partner", () => {
    expect(affiliatePipelineOperationBlockReason("close", "submit")).toMatch(/already an active affiliate/i);
    expect(affiliatePipelineOperationBlockReason("close", "approve")).toMatch(/already an active affiliate/i);
  });

  it("blocks contradictory writes for rejected and ended relationships", () => {
    expect(affiliatePipelineOperationBlockReason("clickup", "approve")).toMatch(/REJECTED/);
    expect(affiliatePipelineOperationBlockReason("bigcommerce", "submit")).toMatch(/PROGRAM_ENDED/);
  });

  it("blocks duplicate submissions for a relationship already pending review", () => {
    expect(affiliatePipelineOperationBlockReason("freshdesk", "submit")).toMatch(/PENDING_REVIEW/);
  });

  it("allows a real approval to supersede a non-terminal pending status", () => {
    expect(affiliatePipelineOperationBlockReason("freshdesk", "approve")).toBeNull();
  });

  it("does not invent a blocker when no current relationship exists", () => {
    expect(affiliatePipelineOperationBlockReason("zoom", "approve")).toBeNull();
  });
});

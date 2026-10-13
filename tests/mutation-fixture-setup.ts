import { vi } from "vitest";

// Existing unit suites exercise active behavior with fake providers/local stores.
// This override exists ONLY in the test runner, never in runtime code. Isolation
// integration tests explicitly unmock it and exercise the real policy + mocked Blob.
vi.mock("@/lib/deployment/mutation-policy", async importOriginal => ({
  ...await importOriginal<typeof import("@/lib/deployment/mutation-policy")>(),
  canMutate: vi.fn(async () => true),
  assertMutationAllowed: vi.fn(async () => {}),
}));

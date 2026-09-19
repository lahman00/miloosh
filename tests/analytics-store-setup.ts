import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll } from "vitest";

// Every test file gets its own disposable store. Never inherit a production
// Blob credential from the shell; Blob-specific tests provide mocked tokens.
delete process.env.BLOB_READ_WRITE_TOKEN;
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "miloosh-analytics-test-"));
process.env.MILOOSH_ANALYTICS_TEST_DIR = directory;
afterAll(() => fs.rmSync(directory, { recursive: true, force: true }));

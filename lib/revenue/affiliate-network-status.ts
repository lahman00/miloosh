import { assertMutationAllowed } from "@/lib/deployment/mutation-policy";
import fs from "node:fs";
import path from "node:path";
import { AGENTS_DIR } from "@/lib/agents/paths";

/**
 * Tracks the owner's own relationship with an affiliate NETWORK (e.g.
 * "PartnerStack Network Profile"), separate from lib/revenue/affiliate-
 * pipeline.ts which tracks per-PRODUCT application state. These are
 * genuinely different things: PartnerStack itself gates every individual
 * program behind a one-time network-level approval, so a single network
 * record here can explain why several product entries are stuck at
 * `waiting_on_network` instead of each needing its own owner-action note.
 *
 * Same storage pattern as affiliate-pipeline.ts (private Blob when
 * BLOB_READ_WRITE_TOKEN is set, local JSON fallback otherwise) — kept as
 * a small, separate module rather than folding pseudo-slugs into the
 * per-product store, since the two represent different real entities and
 * mixing them would make getAllPriorities()/getRankedApplicationCandidates()
 * (which iterate real software products) fragile.
 */

export type AffiliateNetworkStatusValue = "not_applied" | "pending_review" | "approved" | "rejected";

export type AffiliateNetworkStatusEntry = {
  network: string;
  status: AffiliateNetworkStatusValue;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  notes: string | null;
  history: Array<{ status: AffiliateNetworkStatusValue; at: string; note: string | null }>;
};

const BLOB_PATHNAME = "affiliate-pipeline/networks.json";
const LOCAL_FALLBACK_PATH = path.join(AGENTS_DIR, "affiliate-network-status.json");

function hasBlobToken(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function readLocalFallback(): AffiliateNetworkStatusEntry[] {
  try {
    return JSON.parse(fs.readFileSync(LOCAL_FALLBACK_PATH, "utf-8")) as AffiliateNetworkStatusEntry[];
  } catch {
    return [];
  }
}

function writeLocalFallback(entries: AffiliateNetworkStatusEntry[]): void {
  fs.mkdirSync(AGENTS_DIR, { recursive: true });
  fs.writeFileSync(LOCAL_FALLBACK_PATH, JSON.stringify(entries, null, 2));
}

export async function readNetworkStatuses(): Promise<AffiliateNetworkStatusEntry[]> {
  if (!hasBlobToken()) return readLocalFallback();
  try {
    const { get } = await import("@vercel/blob");
    const result = await get(BLOB_PATHNAME, { access: "private", useCache: false });
    if (!result || result.statusCode !== 200) return [];
    const text = await new Response(result.stream).text();
    return JSON.parse(text) as AffiliateNetworkStatusEntry[];
  } catch {
    return [];
  }
}

async function writeNetworkStatuses(entries: AffiliateNetworkStatusEntry[]): Promise<void> {
  await assertMutationAllowed();
  if (!hasBlobToken()) {
    writeLocalFallback(entries);
    return;
  }
  const { put } = await import("@vercel/blob");
  await put(BLOB_PATHNAME, JSON.stringify(entries, null, 2), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

export async function getNetworkStatus(network: string): Promise<AffiliateNetworkStatusEntry | undefined> {
  return (await readNetworkStatuses()).find((e) => e.network === network);
}

function blankEntry(network: string): AffiliateNetworkStatusEntry {
  return { network, status: "not_applied", submittedAt: null, approvedAt: null, rejectedAt: null, notes: null, history: [] };
}

export async function setNetworkStatus(
  network: string,
  status: AffiliateNetworkStatusValue,
  options: { note?: string } = {},
  now: string = new Date().toISOString()
): Promise<AffiliateNetworkStatusEntry> {
  const entries = await readNetworkStatuses();
  const existingIndex = entries.findIndex((e) => e.network === network);
  const entry = existingIndex >= 0 ? entries[existingIndex]! : blankEntry(network);

  const updated: AffiliateNetworkStatusEntry = {
    ...entry,
    status,
    submittedAt: status === "pending_review" && entry.submittedAt === null ? now : entry.submittedAt,
    approvedAt: status === "approved" ? now : entry.approvedAt,
    rejectedAt: status === "rejected" ? now : entry.rejectedAt,
    notes: options.note ?? entry.notes,
    history: [...entry.history, { status, at: now, note: options.note ?? null }],
  };

  if (existingIndex >= 0) {
    entries[existingIndex] = updated;
  } else {
    entries.push(updated);
  }
  await writeNetworkStatuses(entries);
  return updated;
}

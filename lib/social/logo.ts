import { readFile } from "node:fs/promises";
import { join } from "node:path";

const WORDMARK_ASPECT_RATIO = 212 / 43;

let wordmarkCached: Promise<string> | null = null;
let avatarCached: Promise<string> | null = null;

/** Exact canonical wordmark supplied by Eyal on 2026-10-05. */
export function loadCanonicalLogoDataUri(): Promise<string> {
  if (!wordmarkCached) {
    wordmarkCached = readFile(join(process.cwd(), "public", "miloosh-wordmark.png")).then(
      (buffer) => `data:image/png;base64,${buffer.toString("base64")}`,
    );
  }
  return wordmarkCached;
}

/** Square profile representation: the exact wordmark centered on the warm canvas. */
export function loadCanonicalAvatarDataUri(): Promise<string> {
  if (!avatarCached) {
    avatarCached = readFile(join(process.cwd(), "public", "logo-icon.png")).then(
      (buffer) => `data:image/png;base64,${buffer.toString("base64")}`,
    );
  }
  return avatarCached;
}

export function logoWidthForHeight(height: number): number {
  return Math.round(height * WORDMARK_ASPECT_RATIO);
}

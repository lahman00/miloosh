"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

/**
 * MILOOSH PEOPLE NOW mission (2026-08-23), Phase 21 — one lightweight
 * share mechanism, not twenty icons. Uses the native Web Share API where
 * available (mobile, most modern browsers -- gives the visitor their own
 * OS share sheet, real platform choice) and falls back to copying the
 * link. No platform-specific share buttons cluttering the page.
 */
export function ShareButton({ title, url, className }: { title: string; url: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // User cancelled the native share sheet, or clipboard was unavailable — no-op.
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-white/25 hover:text-white ${className ?? ""}`}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
      {copied ? "Link copied" : "Share"}
    </button>
  );
}

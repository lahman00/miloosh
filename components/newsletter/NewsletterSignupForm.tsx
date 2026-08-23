"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail, CheckCircle2 } from "lucide-react";
import { getOrCreateVisitorId, getOrCreateSessionId } from "@/lib/analytics/track";
import { markAndCheckSyntheticQa } from "@/lib/analytics/synthetic";

/**
 * MILOOSH PEOPLE NOW mission (2026-08-23) — the Email Acquisition Engine's
 * one signup form, reused across every placement (source distinguishes
 * where). Consent checkbox is never pre-checked (unchecked is the only
 * valid initial state, enforced by starting state as false and disabling
 * submit until true) and links to the real Privacy Policy rather than
 * paraphrasing it. No dark patterns: the only way to submit is to
 * actively check the box.
 */
export function NewsletterSignupForm({ source }: { source: string }) {
  const pathname = usePathname();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!consent || status === "submitting") return;
    setStatus("submitting");

    try {
      const params = new URLSearchParams(window.location.search);
      const isTest = markAndCheckSyntheticQa();
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          consent,
          source,
          landingPath: pathname,
          utmSource: params.get("utm_source") || undefined,
          utmMedium: params.get("utm_medium") || undefined,
          utmCampaign: params.get("utm_campaign") || undefined,
          utmContent: params.get("utm_content") || undefined,
          visitorId: getOrCreateVisitorId(),
          sessionId: getOrCreateSessionId(),
          isTest,
        }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-300">
        <CheckCircle2 className="h-5 w-5 shrink-0" />
        You&apos;re on the list. We&apos;ll only email you when there&apos;s something real to share.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full rounded-xl border border-white/10 bg-white/[0.02] py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-zinc-500 focus:border-white/25 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={!consent || status === "submitting"}
          className="shrink-0 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {status === "submitting" ? "Subscribing…" : "Subscribe"}
        </button>
      </div>

      <label className="flex items-start gap-2 text-xs text-zinc-500">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-white/20 bg-transparent"
        />
        <span>
          I want to receive occasional emails from Miloosh about software pricing and buying
          research. See our{" "}
          <Link href="/privacy" className="underline underline-offset-4 hover:text-zinc-300">
            Privacy Policy
          </Link>
          . Unsubscribe any time.
        </span>
      </label>

      {status === "error" ? <p className="text-xs text-red-400">Something went wrong — please try again.</p> : null}
    </form>
  );
}

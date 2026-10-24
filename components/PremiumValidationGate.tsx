"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Card } from "@/components/Card";
import { trackEvent } from "@/lib/analytics/track";
import { PREMIUM_GATE_CTA_LOCATION } from "@/data/seo/premium-gate";

/** The one event this card sends. Exported so the payload is tested without a browser. */
export function buildPremiumIntentEvent(path: string, comparisonSlug: string) {
  return { type: "premium_intent_clicked", path, comparisonSlug, ctaLocation: PREMIUM_GATE_CTA_LOCATION } as const;
}

/**
 * Demand test for a premium comparison report that does not exist yet. It says so plainly, collects no email and takes no payment.
 * One click is counted once through the existing first-party tracker; afterwards the card confirms and points back to the vendor
 * options already on the page. It sits below the vendor links and never replaces them.
 */
export function PremiumValidationGate({ comparisonSlug }: { comparisonSlug: string }) {
  const pathname = usePathname();
  const [clicked, setClicked] = useState(false);

  function onClick() {
    if (clicked) return;
    setClicked(true);
    trackEvent(buildPremiumIntentEvent(pathname || `/compare/${comparisonSlug}`, comparisonSlug));
  }

  return (
    <Card className="mt-8 border-white/15" data-testid="premium-validation-gate">
      <h2 className="text-lg font-semibold text-white">Premium pricing report: not available yet</h2>
      <p className="mt-3 leading-7 text-zinc-400">
        We are considering a paid report for comparisons like this one, with alerts when a vendor changes its prices and a cost sheet you can
        share with your team. It does not exist yet, nothing is for sale, and we do not ask for your email here. If it would be useful to
        you, tell us with one click.
      </p>
      <div className="mt-4" aria-live="polite">
        {clicked ? (
          <p className="text-sm leading-6 text-zinc-300">
            Thanks, noted. This report is not available yet, and nothing was sent or charged. Your click is counted anonymously. In the
            meantime, the vendor options on this page are the best next step:{" "}
            <a href="#vendor-choice" className="underline underline-offset-4 hover:text-white">
              see who should choose which
            </a>
            .
          </p>
        ) : (
          <button
            type="button"
            onClick={onClick}
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            I would use this
          </button>
        )}
      </div>
    </Card>
  );
}

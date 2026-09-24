"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ComponentProps, ReactNode } from "react";
import { ButtonLink } from "@/components/ButtonLink";
import type { WixFunnelContext } from "@/lib/wix-funnels";
import { markAndCheckSyntheticQa } from "@/lib/analytics/synthetic";
import { getStoredSessionId, getStoredVisitorId, trackEvent } from "@/lib/analytics/track";
import { assignCtaCopyVariant, type CtaCopyVariant } from "@/lib/experiments/cta-copy-experiment";

type TrackedCtaLinkProps = ComponentProps<typeof ButtonLink> & {
  /** The software slug this CTA points at — resolved server-side, never trusted from the client alone. */
  slug: string;
  /** Where on the page this CTA lives, e.g. "software-page-cta" or "compare-page-choose-card" — a click-tracking dimension only, purely descriptive. */
  ctaLocation?: string;
  /** For Wix specifically: which of the four funnels this placement is about. Ignored (and the server falls back to the safe default) for every other slug or an unrecognized value. */
  wixContext?: WixFunnelContext;
  /**
   * MILOOSH CTA CONVERSION OPTIMIZATION MISSION (2026-08-23) — opt-in,
   * additive only. When omitted (every CTA location except the one under
   * active experimentation), behavior is 100% unchanged: `children` renders
   * exactly as before, no experiment fields on any tracked event. When
   * provided, `control` renders first on both the server and the initial
   * client render (byte-identical, so there's no SSR/hydration mismatch),
   * then a post-mount effect resolves the visitor's real deterministic
   * assignment from lib/experiments/cta-copy-experiment.ts and swaps in
   * `treatment` if assigned — a real design tradeoff, documented below,
   * not an oversight.
   */
  ctaCopyExperiment?: { experimentId: string; control: ReactNode; treatment: ReactNode };
};

/**
 * Sprint 9 Task 6 — the only client boundary needed to fire an outbound-
 * click event: a Server Component page can't attach an onClick handler
 * directly (functions can't cross the server/client boundary), so this
 * thin wrapper is where that happens. Fires a best-effort, non-blocking
 * POST to /api/outbound-click on click; never prevents the link's default
 * navigation, and a failed request doesn't affect the user's click in any
 * way. See lib/revenue/events.ts — recording itself stays a no-op unless
 * NEXT_PUBLIC_REVENUE_TRACKING_ENABLED=true.
 */
export function TrackedCtaLink({ slug, ctaLocation, wixContext, onClick, onAuxClick, ctaCopyExperiment, children, ...props }: TrackedCtaLinkProps) {
  const pathname = usePathname();
  const linkRef = useRef<HTMLAnchorElement>(null);
  const hasFiredImpression = useRef(false);

  // MILOOSH CTA CONVERSION OPTIMIZATION MISSION (2026-08-23) — `variant` is
  // always "control" on the server render AND the initial client render
  // (hydration), which is what keeps this from being a hydration mismatch:
  // both passes evaluate this exact same initializer with no access to
  // localStorage-derived state yet. `variantResolved` distinguishes "we
  // haven't checked yet" (still "control" by default) from "we checked and
  // the visitor really is control" — the impression-tracking effect below
  // waits for this before it starts observing, so a treatment visitor can
  // never have their impression mis-logged as control just because of
  // effect-ordering timing.
  const [variant, setVariant] = useState<CtaCopyVariant>("control");
  const [variantResolved, setVariantResolved] = useState(!ctaCopyExperiment);

  useEffect(() => {
    if (!ctaCopyExperiment) return;
    try {
      const visitorId = getStoredVisitorId();
      if (visitorId) setVariant(assignCtaCopyVariant(visitorId));
    } finally {
      setVariantResolved(true);
    }
    // Deliberately runs once per mount, keyed to which experiment is active —
    // a visitor's assignment must never change mid-session. `ctaCopyExperiment`
    // itself is excluded from the dependency array on purpose: callers pass a
    // fresh object literal every render, which would otherwise re-run this
    // effect (and could reset variantResolved) on every re-render instead of
    // once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctaCopyExperiment?.experimentId]);

  const experimentId = ctaCopyExperiment?.experimentId;
  const renderedChildren = ctaCopyExperiment ? (variant === "treatment" ? ctaCopyExperiment.treatment : ctaCopyExperiment.control) : children;

  // WAR MODE mission (2026-08-22) Phase 21/23 — fire cta_impression exactly
  // once, the first time this CTA is actually visible on screen, not just
  // present in the DOM (a CTA below the fold that nobody scrolled to was
  // never "seen"). Phase 23 forensics: the first version of this observed
  // a `display: contents` wrapper span instead of the link itself, on the
  // (wrong) assumption ButtonLink couldn't forward a ref. `display: contents`
  // elements generate no box of their own — getBoundingClientRect on one is
  // always {0,0,0,0} — so IntersectionObserver could never report it as
  // intersecting, and the whole feature silently never fired in production
  // for the ~90 minutes it was live. Proven via a live browser check against
  // miloosh.com: the CTA was 100% on-screen (real getBoundingClientRect
  // confirmed it inside the viewport) yet zero cta_impression events were
  // stored. Fixed by making ButtonLink forward its ref (see that file) to
  // the real, laid-out <a> element and observing that directly.
  useEffect(() => {
    const node = linkRef.current;
    // variantResolved gate: for an experimental CTA, wait until the real
    // assignment is known so the impression is never mis-attributed to
    // "control" purely because this effect happened to run before the
    // assignment effect above did.
    if (!node || hasFiredImpression.current || !variantResolved) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !hasFiredImpression.current) {
            hasFiredImpression.current = true;
            trackEvent({ type: "cta_impression", path: pathname, softwareSlug: slug, ctaLocation, ...(experimentId ? { experimentId, variant } : {}) });
            observer.disconnect();
          }
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [pathname, slug, ctaLocation, variantResolved, experimentId, variant]);

  const reportOutboundClick = () => {
    try {
    trackEvent({
      type: "cta_click",
      path: pathname,
      softwareSlug: slug,
      ctaLocation,
      ...(experimentId ? { experimentId, variant } : {}),
    });
    const visitorId = getStoredVisitorId();
    const sessionId = getStoredSessionId();
    const isTest = markAndCheckSyntheticQa();
    void fetch("/api/outbound-click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug, kind: "cta", sourcePage: pathname, ctaLocation, wixContext, visitorId, sessionId, isTest,
        ...(experimentId ? { experimentId, variant } : {}),
      }),
      keepalive: true,
    }).catch(() => {
      // Best-effort only — a tracking failure must never affect the user's click.
    });
    } catch {
      // Browser API denial must not interfere with native navigation.
    }
  };

  return (
    <ButtonLink
      {...props}
      ref={linkRef}
      onClick={(event) => {
        onClick?.(event);
        reportOutboundClick();
      }}
      onAuxClick={(event) => {
        onAuxClick?.(event);
        if (event.button === 1) reportOutboundClick();
      }}
    >
      {renderedChildren}
    </ButtonLink>
  );
}

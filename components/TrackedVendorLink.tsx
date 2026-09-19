"use client";

import { usePathname } from "next/navigation";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { markAndCheckSyntheticQa } from "@/lib/analytics/synthetic";
import { getStoredSessionId, getStoredVisitorId } from "@/lib/analytics/track";

type TrackedVendorLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  slug: string;
  href: string;
  ctaLocation: string;
  children: ReactNode;
};

/**
 * Canonical tracker for direct, non-affiliate vendor links such as pricing,
 * docs and support sources. The browser navigates to the caller-provided URL,
 * while /api/outbound-click independently resolves the software server-side
 * and records this as a vendor-link rather than affiliate movement.
 *
 * Synthetic QA marking intentionally matches TrackedCtaLink so production
 * verification can never inflate real vendor-link counts.
 */
export function TrackedVendorLink({ slug, href, ctaLocation, children, onClick, onAuxClick, ...props }: TrackedVendorLinkProps) {
  const pathname = usePathname();
  const reportOutboundClick = () => {
      try {
        const visitorId = getStoredVisitorId();
        const sessionId = getStoredSessionId();
        const isTest = markAndCheckSyntheticQa();

        void fetch("/api/outbound-click", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug,
            kind: "vendor-link",
            sourcePage: pathname,
            ctaLocation,
            visitorId,
            sessionId,
            isTest,
          }),
          keepalive: true,
        }).catch(() => {
          // Best-effort analytics only. Never block the user's navigation.
        });
      } catch {
        // Disabled browser APIs must not interfere with native navigation.
      }
  };

  return (
    <a
      {...props}
      href={href}
      onClick={(event) => {
        onClick?.(event);
        reportOutboundClick();
      }}
      onAuxClick={(event) => {
        onAuxClick?.(event);
        if (event.button === 1) reportOutboundClick();
      }}
    >
      {children}
    </a>
  );
}

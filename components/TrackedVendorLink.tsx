"use client";

import { usePathname } from "next/navigation";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { markAndCheckSyntheticQa } from "@/lib/analytics/synthetic";

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
export function TrackedVendorLink({ slug, href, ctaLocation, children, onClick, ...props }: TrackedVendorLinkProps) {
  const pathname = usePathname();

  return (
    <a
      {...props}
      href={href}
      onClick={(event) => {
        onClick?.(event);
        const visitorId = typeof localStorage !== "undefined" ? localStorage.getItem("miloosh_vid") ?? undefined : undefined;
        const sessionId = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("miloosh_sid") ?? undefined : undefined;
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
      }}
    >
      {children}
    </a>
  );
}

"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { trackEvent } from "@/lib/analytics/track";

type TrackedInternalCtaLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "onClick"> & {
  href: string;
  sourcePath: string;
  targetPath: string;
  ctaName: string;
  children: ReactNode;
};

export function TrackedInternalCtaLink({ href, sourcePath, targetPath, ctaName, children, onAuxClick, ...props }: TrackedInternalCtaLinkProps) {
  const report = () => trackEvent({ type: "internal_cta_click", path: sourcePath, targetPath, ctaName });
  return (
    <a
      {...props}
      href={href}
      onClick={report}
      // A middle-click opens the link in a new tab without firing click; the vendor links already count it.
      onAuxClick={(event) => {
        onAuxClick?.(event);
        if (event.button === 1) report();
      }}
    >
      {children}
    </a>
  );
}

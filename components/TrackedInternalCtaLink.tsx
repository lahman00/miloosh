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

export function TrackedInternalCtaLink({ href, sourcePath, targetPath, ctaName, children, ...props }: TrackedInternalCtaLinkProps) {
  return (
    <a
      {...props}
      href={href}
      onClick={() => trackEvent({ type: "internal_cta_click", path: sourcePath, targetPath, ctaName })}
    >
      {children}
    </a>
  );
}

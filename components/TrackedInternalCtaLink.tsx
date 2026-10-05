"use client";

import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { trackEvent } from "@/lib/analytics/track";

type TrackedInternalCtaLinkProps = Omit<ComponentProps<typeof Link>, "href" | "onClick"> & {
  href: string;
  sourcePath: string;
  targetPath: string;
  ctaName: string;
  children: ReactNode;
};

export function TrackedInternalCtaLink({ href, sourcePath, targetPath, ctaName, children, ...props }: TrackedInternalCtaLinkProps) {
  return (
    <Link
      {...props}
      href={href}
      onClick={() => trackEvent({ type: "internal_cta_click", path: sourcePath, targetPath, ctaName })}
    >
      {children}
    </Link>
  );
}

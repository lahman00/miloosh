import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-1 text-xs font-medium text-zinc-300",
        className
      )}
    >
      {children}
    </span>
  );
}

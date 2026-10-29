import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 transition sm:p-7",
        className
      )}
    >
      {children}
    </div>
  );
}

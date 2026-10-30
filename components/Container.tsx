import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const maxWidths = {
  default: "max-w-6xl",
  narrow: "max-w-3xl",
} as const;

export function Container({
  children,
  className,
  size = "default",
}: {
  children: ReactNode;
  className?: string;
  size?: keyof typeof maxWidths;
}) {
  return (
    <div className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8", maxWidths[size], className)}>
      {children}
    </div>
  );
}

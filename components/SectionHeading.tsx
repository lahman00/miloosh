import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn("max-w-3xl", align === "center" && "mx-auto text-center", className)}
    >
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[.14em] text-zinc-400">
          {eyebrow}
        </p>
      ) : null}
      <h2
        className={cn(
          "text-3xl font-[650] leading-[1.15] tracking-[-.03em] text-white sm:text-4xl",
          eyebrow ? "mt-3" : undefined
        )}
      >
        {title}
      </h2>
      {description ? (
        <p className="mt-4 max-w-[62ch] text-base leading-8 text-zinc-400 sm:text-lg">{description}</p>
      ) : null}
    </div>
  );
}

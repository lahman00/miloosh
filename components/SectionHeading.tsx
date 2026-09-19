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
      className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}
    >
      {eyebrow ? (
        <p className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          {eyebrow}
        </p>
      ) : null}
      <h2
        className={cn(
          "text-3xl font-bold tracking-tight text-white sm:text-4xl",
          eyebrow ? "mt-3" : undefined
        )}
      >
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-base leading-7 text-zinc-400 sm:text-lg">{description}</p>
      ) : null}
    </div>
  );
}

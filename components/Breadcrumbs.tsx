import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function Breadcrumbs({
  items,
}: {
  items: Array<{ name: string; href?: string }>;
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex flex-wrap items-center gap-1.5 text-sm text-zinc-400"
    >
      {items.map((item, index) => (
        <span key={item.name} className="flex items-center gap-1.5">
          {index > 0 ? <ChevronRight className="h-3.5 w-3.5" /> : null}
          {item.href ? (
            <Link href={item.href} className="transition hover:text-white">
              {item.name}
            </Link>
          ) : (
            <span className="text-zinc-300">{item.name}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

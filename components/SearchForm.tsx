"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/Button";
import { resolveSoftwareSearchSlug } from "@/lib/software-search-route";

export function SearchForm({ className }: { className?: string }) {
  const router = useRouter();
  const [software, setSoftware] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const slug = resolveSoftwareSearchSlug(software);

    if (!slug) {
      return;
    }

    router.push(`/software/${slug}`);
  }

  return (
    <form onSubmit={handleSubmit} className={cn("flex w-full flex-col gap-3 sm:flex-row", className)}>
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500"
          strokeWidth={2}
        />
        <input
          value={software}
          onChange={(event) => setSoftware(event.target.value)}
          type="search"
          required
          placeholder="Search for software, e.g. Slack"
          aria-label="Software name"
          className="min-h-14 w-full rounded-xl border border-white/15 bg-white/5 pl-12 pr-5 text-white outline-none placeholder:text-zinc-500 focus:border-accent focus:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-accent"
        />
      </div>

      <Button type="submit" size="lg">
        Find alternatives
      </Button>
    </form>
  );
}

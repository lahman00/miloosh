import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/Container";
import { SITE_NAME } from "@/lib/site";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950">
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-white">
          <Image src="/logo-icon.png" alt="" width={28} height={25} priority />
          {SITE_NAME}
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-zinc-400 sm:flex">
          <Link href="/#how-it-works" className="transition hover:text-accent-hover">
            How it works
          </Link>
          <Link href="/#categories" className="transition hover:text-accent-hover">
            Categories
          </Link>
          <Link href="/#browse" className="transition hover:text-accent-hover">
            Browse
          </Link>
          <Link href="/compare" className="transition hover:text-accent-hover">
            Compare
          </Link>
          <Link href="/guides" className="transition hover:text-accent-hover">
            Guides
          </Link>
        </nav>

        <Link
          href="/recommend"
          className="inline-flex min-h-9 items-center rounded-lg border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Find my software
        </Link>
      </Container>
    </header>
  );
}

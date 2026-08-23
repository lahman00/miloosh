import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/Container";
import { LEGAL_PAGES } from "@/lib/legal";
import { SITE_NAME, SITE_TAGLINE, SITE_VERSION } from "@/lib/site";
import { getDataFreshness } from "@/lib/freshness";
import { formatIsoDate } from "@/lib/date";

const productLinks = [
  { name: "How it works", href: "/#how-it-works" },
  { name: "Categories", href: "/#categories" },
  { name: "Browse", href: "/#browse" },
  { name: "Compare", href: "/compare" },
  { name: "Find my software", href: "/recommend" },
  { name: "Cost calculator", href: "/tools/saas-cost-calculator" },
  { name: "Pricing Pressure Index", href: "/research/saas-pricing-pressure-index-2026" },
];

const companyLinks = [
  { name: "About", href: "/about" },
  { name: "Contact", href: "/contact" },
  { name: "Newsletter", href: "/newsletter" },
];

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: Array<{ name: string; href: string }>;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.name}>
            <Link
              href={link.href}
              className="text-sm text-zinc-400 transition hover:text-accent-hover"
            >
              {link.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  const freshness = getDataFreshness();

  return (
    <footer className="border-t border-white/10">
      <Container className="py-14">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="flex items-center gap-2 text-base font-bold tracking-tight text-white">
              <Image src="/logo-icon.png" alt="" width={22} height={20} />
              {SITE_NAME}
            </Link>
            <p className="mt-4 max-w-[22ch] text-sm leading-6 text-zinc-500">{SITE_TAGLINE}</p>
          </div>

          <FooterColumn title="Product" links={productLinks} />
          <FooterColumn title="Company" links={companyLinks} />
          <FooterColumn title="Legal & trust" links={LEGAL_PAGES} />
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-500">
            © {new Date().getFullYear()} {SITE_NAME} — independent comparisons, not affiliated
            with the listed brands.
          </p>
          <p className="text-xs text-zinc-600">
            v{SITE_VERSION} · {freshness.softwareCount} tools across {freshness.categoryCount}{" "}
            categories · sources last verified {formatIsoDate(freshness.latestAccessedAt)}
          </p>
        </div>
      </Container>
    </footer>
  );
}

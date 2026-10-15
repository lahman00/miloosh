/**
 * The footer's own navigation, kept apart from the component so a test can
 * prove every link resolves to a real route. The "Research" entry that used
 * to sit here pointed at /research, which has no page (404 on every URL of
 * the site); the one research report is reachable as "Pricing Pressure Index".
 */
export type FooterLink = { name: string; href: string };

export const FOOTER_PRODUCT_LINKS: FooterLink[] = [
  { name: "How it works", href: "/#how-it-works" },
  { name: "Categories", href: "/#categories" },
  { name: "Browse", href: "/#browse" },
  { name: "Compare", href: "/compare" },
  { name: "Decision guides", href: "/guides" },
  { name: "Find my software", href: "/recommend" },
  { name: "Cost calculator", href: "/tools/saas-cost-calculator" },
  { name: "Pricing Pressure Index", href: "/research/saas-pricing-pressure-index-2026" },
];

export const FOOTER_COMPANY_LINKS: FooterLink[] = [
  { name: "About", href: "/about" },
  { name: "Contact", href: "/contact" },
  { name: "Newsletter", href: "/newsletter" },
];

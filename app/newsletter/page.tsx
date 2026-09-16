import type { Metadata } from "next";
import { Mail, DollarSign, GitCompare, AlertTriangle } from "lucide-react";
import { Container } from "@/components/Container";
import { Card } from "@/components/Card";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { NewsletterSignupForm } from "@/components/newsletter/NewsletterSignupForm";

export const metadata: Metadata = {
  title: "Miloosh Software Brief: Interest List",
  description:
    "Join the interest list for Miloosh’s planned software-buying brief, covering sourced pricing changes, plan limits and migration warnings. Email delivery has not launched yet.",
  alternates: { canonical: "/newsletter" },
};

const sections = [
  { icon: DollarSign, title: "Pricing changes", body: "When a tool we track raises, lowers, or restructures its pricing, sourced from the vendor's own page." },
  { icon: AlertTriangle, title: "Plan & limitation changes", body: "New seat minimums, usage caps, or features moved behind a higher tier — the kind of change that's easy to miss." },
  { icon: GitCompare, title: "Comparison insight", body: "What we notice comparing hundreds of tools side by side — real differences, not marketing claims." },
];

/**
 * MILOOSH PEOPLE NOW mission (2026-08-23) — Phase 18/19, the lead magnet
 * and Weekly Software Brief landing page. Honest about what this is: a
 * real signup mechanism is live now; actual delivery requires an email
 * provider the owner hasn't configured yet (checked: no RESEND/SENDGRID/
 * MAILCHIMP/POSTMARK/SES env var present in this environment). No signup
 * is lost waiting for that — every one is stored with full attribution
 * the moment sending is turned on.
 */
export default function NewsletterPage() {
  return (
    <main className="flex-1 py-16 sm:py-20">
      <Container size="narrow">
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Newsletter" }]} />

        <header className="mt-6">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-zinc-950">
            <Mail className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Miloosh Software Brief: Interest List
          </h1>
          <p className="mt-6 text-lg leading-8 text-zinc-400">
            Short, verified software-buying intelligence — built from the same sourced-and-dated
            research behind every Miloosh page. Join the interest list for a planned software-buying brief. Sending is not active yet, and no weekly schedule is promised.
          </p>
        </header>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {sections.map((s) => (
            <Card key={s.title}>
              <s.icon className="h-5 w-5 text-zinc-400" />
              <h2 className="mt-3 text-sm font-semibold text-white">{s.title}</h2>
              <p className="mt-2 text-xs leading-5 text-zinc-500">{s.body}</p>
            </Card>
          ))}
        </div>

        <Card className="mt-8">
          <NewsletterSignupForm source="newsletter-page" />
        </Card>
      </Container>
    </main>
  );
}

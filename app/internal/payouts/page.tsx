import type { Metadata } from "next";
import { Landmark } from "lucide-react";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Container } from "@/components/Container";
import { SectionHeading } from "@/components/SectionHeading";
import { PAYOUT_RAILS } from "@/data/affiliate/payout-rails";
import { OWNER_ACTION_PACKS } from "@/data/affiliate/owner-action-packs";

export const metadata: Metadata = {
  title: "Payouts",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const STATUS_LABEL = {
  VERIFIED: "Verified",
  UNVERIFIED: "Needs verification",
  OWNER_ACTION_REQUIRED: "Owner action",
} as const;

export default function InternalPayoutsPage() {
  const ownerPackById = new Map(OWNER_ACTION_PACKS.map((pack) => [pack.id, pack]));
  const activeCovered = PAYOUT_RAILS.reduce((sum, rail) => sum + rail.partnerSlugs.length, 0);
  const ownerActions = PAYOUT_RAILS.filter((rail) => rail.readiness !== "VERIFIED").length;

  return (
    <main className="flex-1 py-16 sm:py-20">
      <Container>
        <header className="max-w-3xl">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-zinc-950">
            <Landmark className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl">Payout control plane</h1>
          <p className="mt-6 text-lg leading-8 text-zinc-400">
            Internal only. The {activeCovered} active affiliate partners collapse into {PAYOUT_RAILS.length} payout rails. This page stores no bank, tax, identity, password, or 2FA data.
          </p>
        </header>

        <section className="mt-12 grid gap-4 sm:grid-cols-3">
          <Card>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Active partners covered</p>
            <p className="mt-2 text-3xl font-semibold text-white">{activeCovered}</p>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Payout rails</p>
            <p className="mt-2 text-3xl font-semibold text-white">{PAYOUT_RAILS.length}</p>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Rails not yet verified</p>
            <p className="mt-2 text-3xl font-semibold text-white">{ownerActions}</p>
          </Card>
        </section>

        <section className="mt-16">
          <SectionHeading eyebrow="Payout rails" title="One setup per network, not per vendor" />
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {PAYOUT_RAILS.map((rail) => {
              const pack = ownerPackById.get(rail.ownerActionPackId);
              return (
                <Card key={rail.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-white">{rail.label}</h2>
                      <p className="mt-1 text-sm text-zinc-500">{rail.partnerSlugs.length} active partner{rail.partnerSlugs.length === 1 ? "" : "s"}</p>
                    </div>
                    <Badge>{STATUS_LABEL[rail.readiness]}</Badge>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-zinc-400">{rail.notes}</p>
                  <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.025] p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Method guidance</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-300">{rail.methodGuidance}</p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {rail.partnerSlugs.map((slug) => (
                      <span key={slug} className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-zinc-400">
                        {slug}
                      </span>
                    ))}
                  </div>
                  {pack ? (
                    <div className="mt-5 border-t border-white/10 pt-5">
                      <p className="text-sm font-medium text-zinc-200">Next owner checkpoint</p>
                      <p className="mt-2 text-sm text-zinc-400">{pack.title}</p>
                      <ul className="mt-3 space-y-2 text-sm text-zinc-500">
                        {pack.ownerRequiredFields.map((field) => (
                          <li key={field}>• {field}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </Card>
              );
            })}
          </div>
        </section>

        <section className="mt-16">
          <SectionHeading eyebrow="Optional network" title="CJ stays isolated" />
          <Card className="mt-6">
            <p className="text-sm leading-6 text-zinc-400">
              CJ is intentionally not counted among the four active-partner payout rails. Preserve the two evidenced publisher CIDs and reconcile them only for vendors whose current publisher path genuinely requires CJ. CJ officially supports Payoneer for publisher payouts, but the live account must prove whether Miloosh has actually linked it. Do not create a third account.
            </p>
          </Card>
        </section>
      </Container>
    </main>
  );
}

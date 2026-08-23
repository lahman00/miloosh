import type { Metadata } from "next";
import { CheckCircle2, XCircle } from "lucide-react";
import { Container } from "@/components/Container";
import { Card } from "@/components/Card";
import { unsubscribeByToken } from "@/lib/newsletter/leads";

export const metadata: Metadata = {
  title: "Unsubscribe — Miloosh",
  robots: { index: false, follow: false },
};

type UnsubscribePageProps = {
  searchParams: Promise<{ token?: string }>;
};

/**
 * MILOOSH PEOPLE NOW mission (2026-08-23) — a real, working unsubscribe
 * mechanism, functional even before any email is ever sent (the token is
 * generated at signup time). Server Component: the unsubscribe action
 * happens on load, no client JS or extra confirmation click required --
 * standard, expected one-click-unsubscribe behavior. Never fabricates
 * success: an invalid/already-used token shows an honest "not found"
 * state.
 */
export default async function UnsubscribePage({ searchParams }: UnsubscribePageProps) {
  const { token } = await searchParams;
  const success = token ? await unsubscribeByToken(token) : false;

  return (
    <main className="flex-1 py-16 sm:py-20">
      <Container size="narrow">
        <Card className="text-center">
          <span className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${success ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
            {success ? <CheckCircle2 className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
          </span>
          <h1 className="mt-5 text-2xl font-bold text-white">
            {success ? "You're unsubscribed" : "Link not recognized"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            {success
              ? "You won't receive any further emails from Miloosh. You can re-subscribe any time from the newsletter page."
              : "This unsubscribe link is invalid or has already been used. If you're still receiving emails and believe this is an error, contact us."}
          </p>
        </Card>
      </Container>
    </main>
  );
}

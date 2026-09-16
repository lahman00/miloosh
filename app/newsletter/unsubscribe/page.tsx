import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { Container } from "@/components/Container";
import { Card } from "@/components/Card";
import { unsubscribeByToken } from "@/lib/newsletter/leads";

export const metadata: Metadata = {
  title: "Unsubscribe — Miloosh",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type UnsubscribePageProps = {
  searchParams: Promise<{ token?: string }>;
};

// העדפה אישית אינה נשמרת במטמון. הסרה חוזרת בטוחה; תקלה מוצגת בנפרד.
export const dynamic = "force-dynamic";

export default async function UnsubscribePage({ searchParams }: UnsubscribePageProps) {
  const { token } = await searchParams;
  const hasToken = typeof token === "string" && token.trim().length > 0;
  let success = false;
  let unavailable = false;
  if (hasToken) {
    try { success = await unsubscribeByToken(token); }
    catch { unavailable = true; }
  }

  return (
    <main className="flex-1 py-16 sm:py-20">
      <Container size="narrow">
        <Card className="text-center">
          <span className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${success ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
            {success ? <CheckCircle2 className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
          </span>
          <h1 className="mt-5 text-2xl font-bold text-white">
            {unavailable ? "Unsubscribe temporarily unavailable" : success ? "You're unsubscribed" : "Link not recognized"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            {unavailable
              ? "We couldn't confirm that your newsletter preference was saved. Please retry this link shortly or contact Miloosh for help."
              : success
                ? "Your newsletter preference is saved as unsubscribed. You can re-subscribe any time from the newsletter page."
                : "This unsubscribe link is incomplete or unrecognized. Check that you copied the full link, or contact Miloosh for help."}
          </p>
          <p className="mt-5 flex flex-wrap justify-center gap-5 text-sm">
            <Link href="/" className="underline underline-offset-4">Return to Miloosh</Link>
            <a href="mailto:hello@miloosh.com" className="underline underline-offset-4">Contact Miloosh</a>
          </p>
        </Card>
      </Container>
    </main>
  );
}

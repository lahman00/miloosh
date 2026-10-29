import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { Container } from "@/components/Container";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Card } from "@/components/Card";
import { ButtonLink } from "@/components/ButtonLink";
import { JsonLd } from "@/components/JsonLd";
import { getBreadcrumbJsonLd } from "@/lib/structured-data";
import { SITE_EMAIL, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Get in touch with the ${SITE_NAME} team.`,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <main className="page-shell flex-1">
      <JsonLd
        data={getBreadcrumbJsonLd([
          { name: "Home", url: SITE_URL },
          { name: "Contact", url: `${SITE_URL}/contact` },
        ])}
      />

      <Container size="narrow">
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Contact" }]} />

        <h1 className="page-title">
          Get in touch
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
          Spotted an inaccurate comparison, or want us to cover a tool we&apos;re missing? Send
          us a note.
        </p>

        <Card className="mt-10 flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-zinc-950">
              <Mail className="h-5 w-5" strokeWidth={2.25} />
            </span>
            <div>
              <p className="text-sm text-zinc-500">Email us</p>
              <p className="font-semibold text-white">{SITE_EMAIL}</p>
            </div>
          </div>

          <ButtonLink href={`mailto:${SITE_EMAIL}`} variant="secondary">
            Send an email
          </ButtonLink>
        </Card>
      </Container>
    </main>
  );
}

import type { ReactNode } from "react";
import { Container } from "@/components/Container";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { LegalContent } from "@/components/LegalContent";
import { JsonLd } from "@/components/JsonLd";
import { getBreadcrumbJsonLd } from "@/lib/structured-data";
import { LEGAL_LAST_UPDATED } from "@/lib/legal";
import { SITE_URL } from "@/lib/site";

export function LegalPageLayout({
  title,
  path,
  sections,
  lastUpdated = LEGAL_LAST_UPDATED,
}: {
  title: string;
  path: string;
  sections: Array<{ heading: string; body: ReactNode }>;
  lastUpdated?: string;
}) {
  return (
    <main className="page-shell flex-1">
      <JsonLd
        data={getBreadcrumbJsonLd([
          { name: "Home", url: SITE_URL },
          { name: title, url: `${SITE_URL}${path}` },
        ])}
      />

      <Container size="wide">
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: title }]} />

        <h1 className="page-title">{title}</h1>
        <p className="page-meta">Last updated {lastUpdated}</p>

        <LegalContent sections={sections} />
      </Container>
    </main>
  );
}

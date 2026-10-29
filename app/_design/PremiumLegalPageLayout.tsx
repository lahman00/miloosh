import type { ReactNode } from "react";
import { Container } from "@/components/Container";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ReadingLayout } from "@/app/_design/ReadingLayout";
import styles from "@/app/_design/premium.module.css";
import { JsonLd } from "@/components/JsonLd";
import { getBreadcrumbJsonLd } from "@/lib/structured-data";
import { LEGAL_LAST_UPDATED } from "@/lib/legal";
import { SITE_URL } from "@/lib/site";

export function PremiumLegalPageLayout({
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
    <main className={`${styles.shell} flex-1`}>
      <JsonLd
        data={getBreadcrumbJsonLd([
          { name: "Home", url: SITE_URL },
          { name: title, url: `${SITE_URL}${path}` },
        ])}
      />

      <Container className={styles.wide}>
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: title }]} />

        <h1 className={styles.title}>{title}</h1>
        <p className={styles.meta}>Last updated {lastUpdated}</p>

        <ReadingLayout sections={sections} />
      </Container>
    </main>
  );
}

import type { ReactNode } from "react";
import styles from "./ReadingLayout.module.css";

export type ReadingSection = { id?: string; heading: string; body: ReactNode };

function slugify(heading: string) {
  return heading
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function withIds(sections: ReadingSection[]) {
  const seen = new Set<string>();
  return sections.map((section, index) => {
    let id = section.id ?? (slugify(section.heading) || `section-${index + 1}`);
    while (seen.has(id)) id = `${id}-${index + 1}`;
    seen.add(id);
    return { ...section, id };
  });
}

/** Long-form reading surface: sticky "On this page" nav beside separated sections. */
export function ReadingLayout({ sections }: { sections: ReadingSection[] }) {
  const items = withIds(sections);
  return (
    <div className={styles.readingLayout}>
      <nav className={styles.sectionNav} aria-label="On this page">
        <span className={styles.navLabel}>On this page</span>
        <ul>
          {items.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`}>{section.heading}</a>
            </li>
          ))}
        </ul>
      </nav>
      <div className={styles.sections}>
        {items.map((section) => (
          <section key={section.id} aria-labelledby={section.id}>
            <h2 id={section.id} tabIndex={-1}>{section.heading}</h2>
            <div className={styles.body}>{section.body}</div>
          </section>
        ))}
      </div>
    </div>
  );
}

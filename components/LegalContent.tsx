import type { ReactNode } from "react";
import { ReadingLayout } from "@/components/ReadingLayout";

export function LegalContent({
  sections,
}: {
  sections: Array<{ heading: string; body: ReactNode }>;
}) {
  return <ReadingLayout sections={sections} />;
}

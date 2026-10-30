import styles from "../decision-room.module.css";
import type { Evidence } from "@/lib/decision-room/types";

const WORDS = { verified: "Verified", documented_limited: "Documented, limited", unknown: "Unknown" } as const;
const MARKS = { verified: "✓", documented_limited: "◐", unknown: "?" } as const;
const CLASS = { verified: styles.chipVerified, documented_limited: styles.chipDocumented, unknown: styles.chipUnknown } as const;

/** Status is always text plus a mark, never colour alone. */
export function StatusChip({ evidence }: { evidence: Pick<Evidence, "status" | "value"> }) {
  const value = evidence.value ? `: ${evidence.value === "yes" ? "yes" : "no"}` : "";
  return (
    <span className={`${styles.chip} ${CLASS[evidence.status]}`}>
      <span aria-hidden="true">{MARKS[evidence.status]}</span>
      {WORDS[evidence.status]}{value}
    </span>
  );
}

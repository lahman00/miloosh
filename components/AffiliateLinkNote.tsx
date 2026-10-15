import Link from "next/link";

/**
 * The disclosure that must sit next to a paid link, in the same words the
 * profile and comparison pages already use. Render it only beside a call to
 * action whose `rel` carries `sponsored`.
 */
export function AffiliateLinkNote({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs leading-5 text-zinc-400 ${className}`.trim()}>
      This is an affiliate link. See our{" "}
      <Link href="/affiliate-disclosure" className="underline underline-offset-4 hover:text-white">
        Affiliate Disclosure
      </Link>
      .
    </p>
  );
}

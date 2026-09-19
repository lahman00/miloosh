import Link from "next/link";
import { Container } from "@/components/Container";
import { buttonClasses } from "@/lib/button-styles";
import { SITE_NAME } from "@/lib/site";

/**
 * Non-blocking bottom banner shown only while consent is "unset" (first
 * visit, or storage was cleared). Declining is exactly as easy as
 * accepting — same size, same row — since a banner that makes "no" harder
 * to find than "yes" isn't really offering a real choice.
 */
export function ConsentBanner({
  onAccept,
  onDecline,
}: {
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-zinc-950"
    >
      <Container className="flex flex-col items-start gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm leading-6 text-zinc-400">
          {SITE_NAME}{" "}
          would like to use Google Analytics to understand how visitors use the site. Nothing is
          set unless you choose &quot;Allow&quot; — see our{" "}
          <Link href="/cookies" className="text-white underline underline-offset-4">
            Cookie Policy
          </Link>{" "}
          for what that does and doesn&apos;t mean. You can change this anytime on that page.
        </p>
        <div className="flex shrink-0 gap-3">
          <button type="button" onClick={onDecline} className={buttonClasses("ghost", "md")}>
            Decline
          </button>
          <button type="button" onClick={onAccept} className={buttonClasses("primary", "md")}>
            Allow analytics
          </button>
        </div>
      </Container>
    </div>
  );
}

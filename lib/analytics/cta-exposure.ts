/** A measured exposure is >= half of the link in a foreground document.
 * Observer callbacks also run on initial observation BELOW their threshold.
 * Missing observer support means unknown exposure, never an invented view.
 */
export function observeCtaExposure(node: Element, onExposure: () => void): () => void {
  if (typeof IntersectionObserver === "undefined") return () => {};
  let visibleRatio = 0;
  let fired = false;
  const report = () => {
    if (fired || document.visibilityState === "hidden" || visibleRatio < 0.5) return;
    fired = true;
    onExposure();
    cleanup();
  };
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.target !== node) continue;
      visibleRatio = entry.isIntersecting ? entry.intersectionRatio : 0;
      report();
    }
  }, { threshold: 0.5 });
  const cleanup = () => {
    observer.disconnect();
    document.removeEventListener("visibilitychange", report);
  };
  document.addEventListener("visibilitychange", report);
  observer.observe(node);
  return cleanup;
}

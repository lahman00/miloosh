const ENGAGED_MS = 10_000;

/** One event per page-effect lifetime after ten cumulative foreground seconds.
 * Visibility is evidence of exposure, not proof of attention or a human visit.
 * The monotonic clock avoids counting a wall-clock adjustment as engagement.
 */
export function observeEngagedView(onEngaged: (durationSeconds: number) => void): () => void {
  if (typeof document === "undefined") return () => {};
  let elapsed = 0;
  let started: number | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;

  const clearTimer = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  const accumulate = () => {
    if (started !== undefined) elapsed += Math.max(0, performance.now() - started);
    started = undefined;
  };
  const cleanup = () => {
    stopped = true;
    clearTimer();
    document.removeEventListener("visibilitychange", visibilityChanged);
  };
  const resume = () => {
    if (stopped || document.visibilityState !== "visible") return;
    if (elapsed >= ENGAGED_MS) {
      cleanup();
      onEngaged(Math.floor(elapsed / 1000));
      return;
    }
    started = performance.now();
    timer = setTimeout(() => {
      timer = undefined;
      // If a throttled callback arrives hidden before visibilitychange, do
      // not credit an interval whose visibility we can no longer establish.
      if (document.visibilityState === "visible") accumulate();
      else started = undefined;
      resume();
    }, ENGAGED_MS - elapsed);
  };
  function visibilityChanged() {
    clearTimer();
    accumulate();
    resume();
  }
  document.addEventListener("visibilitychange", visibilityChanged);
  resume();
  return cleanup;
}

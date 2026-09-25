import { normalizeTrafficSource, type TrafficSource } from "@/lib/analytics/attribution";

export type AcquisitionContext = {
  sessionId: string;
  landingPath: string;
  capturedAt: string;
  trafficSource: TrafficSource;
  referrerHost?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
};

/** Deliberately exclude queries, hashes, full URLs and free-text path data. */
export function analyticsPath(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const pathname = value.split(/[?#]/)[0];
  return /^\/(?:[a-zA-Z0-9_-]+\/?)*$/.test(pathname) && pathname.length <= 300 ? pathname : undefined;
}

export function campaignLabel(value: unknown): string | undefined {
  return typeof value === "string" && /^[a-zA-Z0-9_.~-]{1,64}$/.test(value) ? value : undefined;
}

/** Browser evidence, not verified identity or merchant-side attribution.
 * Sanitize again at each server boundary, and bind the snapshot to this
 * event's session. Never accept arbitrary browser objects into either store.
 */
export function sanitizeAcquisition(value: unknown, sessionId: string, now = Date.now()): AcquisitionContext | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  const landingPath = analyticsPath(raw.landingPath);
  const at = typeof raw.capturedAt === "string" ? Date.parse(raw.capturedAt) : NaN;
  if (raw.sessionId !== sessionId || !landingPath || !Number.isFinite(at) || at > now + 60_000) return undefined;
  const referrerHost = typeof raw.referrerHost === "string" && /^[a-zA-Z0-9.-]{1,253}$/.test(raw.referrerHost) ? raw.referrerHost.toLowerCase() : undefined;
  const fields = {
    referrerHost, utmSource: campaignLabel(raw.utmSource), utmMedium: campaignLabel(raw.utmMedium),
    utmCampaign: campaignLabel(raw.utmCampaign), utmContent: campaignLabel(raw.utmContent),
  };
  return {
    sessionId, landingPath, capturedAt: new Date(at).toISOString(), ...fields,
    trafficSource: raw.trafficSource === "unknown" ? "unknown" : normalizeTrafficSource({ ...fields, referrerObserved: raw.trafficSource === "direct" }),
  };
}

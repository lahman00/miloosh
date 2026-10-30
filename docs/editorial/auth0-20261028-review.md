# Auth0 source review — 2026-10-28

Purpose: Upgrade an existing published software page that had 107 historical Google Search Console impressions but was excluded from the sitemap by Miloosh's quality gate. This is a source-backed buyer-value improvement, not a fabricated freshness bump or ranking promise.

Official sources checked on 2026-10-28:
- https://auth0.com/pricing — B2C monthly pricing and plan entitlements. Free: $0 and up to 25,000 MAU. Essentials: $35/month at 500 MAU. Professional: $240/month at 500 MAU. Enterprise: contact sales. The FAQ states a 22-day trial before Free activates.
- https://auth0.com/organizations — B2B Organizations capability and customer-specific access workflows.
- https://support.auth0.com/center/s/article/SCIM-support-at-Auth0 — inbound SCIM support and scope.
- https://support.auth0.com/center/s/article/Entitlements-for-Enterprise-MFA-Feature — distinction between Pro MFA and Enterprise MFA entitlements.

Buyer caveats added: MAU/use-case pricing variability; major feature-entitlement differences between tiers; B2B/SSO/SCIM plan implications; Free-tier operational limits.

Exact behavior intended: Auth0 should move from quality-gate failures `pricing-evidence`, `pricing-freshness`, `documented-constraints`, `source-coverage` to quality-ready. No affiliate link, canonical, robots directive, comparison suppression rule or unrelated product data is changed. A live release does not prove Google will index or rank the page; URL Inspection should be checked after release and at most one indexing request submitted if it remains unindexed.

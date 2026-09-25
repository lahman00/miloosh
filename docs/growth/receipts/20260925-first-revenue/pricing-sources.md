# Scoped first-party pricing checks — 2026-09-25

These checks verify the specified claims, not every field of the vendor catalog. All product recommendations remain independent of commissions. No affiliate URL was regenerated or altered.

| Product | First-party source | Verified correction |
|---|---|---|
| Airtable | https://airtable.com/pricing | Team USD20 per seat/month and Business USD45 per seat/month, both annual billing. An editor seat is billable; read-only/form submissions do not create the same seat charge. |
| Close | https://close.com/pricing | Solo USD9 per user/month on annual billing, not USD9 per year. Solo is one user/10k leads; workflows require Growth or Scale, not Solo/Essentials. |
| Todoist | https://www.todoist.com/pricing/ | Pro annual USD60 is equivalent to USD5/month, not a USD5 monthly-renewal offer. Data already expressed annual commitment; the panel now shows it. |
| Setmore | https://www.setmore.com/pricing | Free up to four users; Pro USD5 per user/month annual or USD12 monthly. Pro's unlimited user count is not a flat-price unlimited-seat license. Paid Pro includes SMS and two-way sync. |
| ElevenLabs | https://elevenlabs.io/pricing | Creator monthly renewal USD22 with a USD11 first-month offer; Starter USD6/month. Credit amounts and taxes must not be silently treated as unrestricted use. |

Production before-state is in `live-before.json`. No merchant visit or commission has been fabricated for testing. Any QA events must use `isTest:true`, and external affiliate navigation must be blocked during synthetic testing.

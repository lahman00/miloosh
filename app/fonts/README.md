# Inter

`inter-latin-variable.woff2` is the unmodified Inter Latin variable font
previously emitted by this site's `next/font/google` Inter configuration.
It was copied from the existing local build's `83afe278b6a6bb3c-s.p.2bn3s6zvc0dyp.woff2`.
The English site keeps the same Latin font and weights (100–900); characters
outside this subset use the system fallback.

Keeping the asset in source removes the Google Fonts network dependency at
build time. `next/font/local` still supplies preload, swap and fallback metrics.
This is build reproducibility, not a claim of improved field Core Web Vitals.

Upstream: https://github.com/rsms/inter
License: SIL Open Font License 1.1, copied from
https://raw.githubusercontent.com/rsms/inter/master/LICENSE.txt on 2026-09-26.

# Frozen-control research isolation

Release intake: a0c950df9d3c42bf36ae7c5f9acacd1c88136ef1.
Research handoff: 981a491381da45bd61df0ddbe2e80e6c2135f76b.

The handoff corrects/re-verifies all 16 support records. Two corresponding
software pages are control observations: Re:amaze (held-out Wave 3) and Tidio
(natural ranking comparison). Their catalog JSON remains byte-for-byte at
release intake. The research-only pricing snapshots are the handoff's exact
pricing fields normalized through the existing mapSoftware mapper. They are
not imported by software, comparison, recommendation or ranking code.

This preserves Claude's research corrections without applying a second
content intervention to those control product pages. Existing Re:amaze
protocol contamination from 4d34fd1 remains recorded and its contrast remains
suppressed. Cohort membership is unchanged; no control is reassigned.

The release-contract tests pin the intake hashes and validate research values.
An experiment owner must explicitly review any future update to these control
files; do not silently update their expected hashes to make a gate pass.

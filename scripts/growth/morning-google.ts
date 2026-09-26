import { runAuthorityReport } from "./authority-report";
try { runAuthorityReport(); console.log("Morning Google + authority report: var/growth/authority/morning.md. No external writes or scheduled wakeups."); }
catch { console.error("Morning report unavailable; no fabricated metrics"); process.exitCode = 1; }

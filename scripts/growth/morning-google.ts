import { runAuthorityReport } from "./authority-report";
import { runOperationsReport } from "./operations-report";
try { runOperationsReport(runAuthorityReport()); console.log("Morning Google + operations report: var/growth/operations/index.html. No external writes; scheduled wakeups are managed separately."); }
catch { console.error("Morning report unavailable; no fabricated metrics"); process.exitCode = 1; }

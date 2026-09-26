import fs from "node:fs";
import { appendAuthority, parseRegistry } from "@/lib/authority/registry";
import { updateLocalStore } from "@/lib/authority/store";
import seed from "@/data/growth/authority/registry.json";
try {
  const index = process.argv.indexOf("--input");
  const incoming = index >= 0 ? parseRegistry(JSON.parse(fs.readFileSync(process.argv[index + 1], "utf8"))) : parseRegistry(seed);
  const rows = updateLocalStore("var/growth/authority/registry.json", prior => appendAuthority(appendAuthority(parseRegistry(seed), parseRegistry(prior)), incoming));
  console.log(JSON.stringify({ placements: rows.length, networkRequests: 0, publicActions: 0 }));
} catch { console.error("Authority import rejected: inspect schema, immutable IDs and local lock; existing history preserved"); process.exitCode = 1; }

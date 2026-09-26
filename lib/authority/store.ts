import fs from "node:fs";
import path from "node:path";
/** Local atomic read/validate/append only. Lock prevents concurrent lost updates. */
export function updateLocalStore<T>(file: string, update: (previous: unknown) => T): T {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const lock = `${file}.lock`, fd = fs.openSync(lock, "wx");
  try {
    const value = update(fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : []);
    const temp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(value, null, 2) + "\n", { mode: 0o600, flag: "wx" });
    fs.renameSync(temp, file); return value;
  } finally { fs.closeSync(fd); fs.unlinkSync(lock); }
}

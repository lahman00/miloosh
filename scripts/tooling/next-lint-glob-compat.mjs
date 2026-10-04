import { createRequire } from "node:module";
import { statSync } from "node:fs";
import { isAbsolute } from "node:path";
import picomatch from "picomatch";

const require = createRequire(import.meta.url);
const marker = Symbol.for("miloosh.next-lint-glob-compat.v1");

/**
 * Adapt only the published Next 16.3.8 plugin's directory-discovery call.
 * This is NOT a general fast-glob replacement. The npm override removes
 * braces; this boundary maps the caller to published glob@13.0.6.
 * No vendor package source, Next rule, or audit result is patched on disk.
 */
export function installNextLintGlobCompatibility() {
  const pluginManifest = require("@next/eslint-plugin-next/package.json");
  if (pluginManifest.version !== "16.3.8") {
    throw new Error("Review/remove Miloosh's lint glob adapter before changing the Next ESLint plugin version.");
  }
  const pluginRequire = createRequire(require.resolve("@next/eslint-plugin-next"));
  const globPath = pluginRequire.resolve("fast-glob");
  const globManifest = pluginRequire("fast-glob/package.json");
  if (globManifest.name !== "glob" || globManifest.version !== "13.0.6") {
    throw new Error("Expected the reviewed glob@13.0.6 scoped override; refuse an unknown lint dependency.");
  }
  const implementation = pluginRequire("fast-glob");
  if (implementation[marker]) return;
  const rootsModule = pluginRequire.resolve("./utils/get-root-dirs.js");
  if (require.cache[rootsModule]) {
    throw new Error("Install the lint glob adapter before importing eslint-config-next or the Next plugin.");
  }

  const globSync = (pattern, options) => {
    if (typeof pattern !== "string" || pattern.length === 0) {
      throw new TypeError("Patterns must be a string (non empty) or an array of strings");
    }
    if (!options || options.onlyDirectories !== true || Object.keys(options).length !== 1) {
      throw new Error("Unreviewed Next glob call: only globSync(string, { onlyDirectories: true }) is supported.");
    }
    // fast-glob ignores a purely negative pattern (extglob is not negation).
    if (pattern.startsWith("!") && !pattern.startsWith("!(")) return [];
    // glob includes a trailing globstar's base; fast-glob walks below it.
    const compatiblePattern = pattern.replace(/(^|\/)\*\*\/?$/, "$1**/*");
    // Picomatch (the original matcher family) admits dot-directories in a
    // negative extglob, while ordinary wildcards still exclude dot entries.
    const negativeExtglob = pattern.includes("!(");
    const negativeMatcher = negativeExtglob ? picomatch.makeRe(compatiblePattern.replace(/^\.\//, "").replace(/\/$/, ""), { dot: false, posix: true }) : null;
    return implementation.globSync(compatiblePattern, {
      nodir: false,
      follow: true,
      dot: negativeExtglob,
      nocase: false,
      absolute: isAbsolute(pattern),
    }).filter((entry) => {
      if (negativeMatcher && !negativeMatcher.test(entry.replace(/\/$/, ""))) return false;
      try {
        return statSync(entry).isDirectory();
      } catch (error) {
        if (error.code === "ENOENT" || error.code === "ENOTDIR") return false;
        throw error;
      }
    });
  };

  // The Next caller consumes only this synchronous directory API. Refuse
  // unreviewed API expansion rather than accidentally skipping a lint rule.
  require.cache[globPath].exports = Object.freeze({ globSync, [marker]: true });
}

// CLI wrapper around the content pipeline. Used by `npm run build:content`,
// the pre-dev / pre-build hooks, and CI. Exits non-zero (failing the build
// loudly) on any validation error — see docs/SPRINTS.md, Sprint 0 "Done when".

import { compileContent, ContentError } from "./compile-content.mjs";

try {
  compileContent({ write: true });
} catch (err) {
  if (err instanceof ContentError) {
    console.error("\n" + err.message + "\n");
    process.exit(1);
  }
  throw err;
}

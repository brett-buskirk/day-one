import { describe, it, expect } from "vitest";
import { corpus } from "./corpus";

// The resource directory is safety-critical, real-world data (helplines, aid).
// These guard against an authoring typo silently breaking the debrief section.
describe("resource directory", () => {
  const resources = corpus.resources ?? [];

  it("ships a populated national baseline", () => {
    expect(resources.length).toBeGreaterThanOrEqual(5);
  });

  it("every resource is well-formed and reachable", () => {
    for (const r of resources) {
      expect(r.category, "category is required").toBeTruthy();
      expect(r.name, "name is required").toBeTruthy();
      // A resource is useless if you can't reach it.
      expect(Boolean(r.phone || r.url), `${r.name} needs a phone or url`).toBe(true);
      // Links must be https (the debrief opens them in a new tab).
      if (r.url) expect(r.url, `${r.name} url`).toMatch(/^https:\/\//);
    }
  });
});

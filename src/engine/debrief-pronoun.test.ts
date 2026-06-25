import { describe, it, expect } from "vitest";
import { corpus } from "../content/corpus";
import { createRun, buildDebrief } from "./index";

// Regression guard for the misgendered-debrief bug: the intro hardcoded "how he got
// there", which misgendered every female build. The pronoun is now authored per
// character and threaded into the debrief.
describe("debrief pronouns — no misgendering", () => {
  it("threads the character's pronoun into the intro", () => {
    const tasha = buildDebrief(createRun(corpus, "tasha", { seed: 1 }), "Tasha", "she");
    expect(tasha.headline).toContain("how she got there");
    expect(tasha.headline).not.toContain("how he got there");

    const marcus = buildDebrief(createRun(corpus, "marcus", { seed: 1 }), "Marcus", "he");
    expect(marcus.headline).toContain("how he got there");
  });

  it("defaults to 'they' when no pronoun is supplied (e.g. a random build)", () => {
    const d = buildDebrief(createRun(corpus, "marcus", { seed: 1 }), "this person");
    expect(d.headline).toContain("how they got there");
  });

  it("every authored character carries a pronoun", () => {
    for (const id of Object.keys(corpus.characters)) {
      expect(corpus.characters[id].person.pronoun, `${id} is missing a pronoun`).toMatch(
        /^(he|she|they)$/,
      );
    }
  });
});

import { describe, it, expect } from "vitest";
import { corpus } from "../content/corpus";
import { createRun, buildDebrief, eligibleActions, resolveChoice } from "./index";
import type { GameState } from "./index";

const keys = (s: GameState) => buildDebrief(s, "x").milestones.map((m) => m.key);
const milestone = (s: GameState, key: string) =>
  buildDebrief(s, "x").milestones.find((m) => m.key === key);

// Milestones should only score paths a build can actually walk — no permanent "miss" on a
// door the game never offered, and no freebie for a door that was never a challenge.
describe("milestones only score the paths a build can walk", () => {
  it("supervision is N/A for an unsupervised build, present for a supervised one", () => {
    expect(keys(createRun(corpus, "cal", { seed: 1 }))).not.toContain("supervision"); // maxed out
    expect(keys(createRun(corpus, "marcus", { seed: 1 }))).toContain("supervision"); // on parole
  });

  it("every build has a support milestone — and it's earned, not handed out at chargen", () => {
    for (const id of Object.keys(corpus.characters)) {
      const m = milestone(createRun(corpus, id, { seed: 1 }), "support");
      expect(m, `${id} should have a support milestone`).toBeDefined();
      expect(m!.achieved, `${id}'s support milestone should not be pre-achieved`).toBe(false);
    }
  });

  it("a non-recovery build earns the support milestone via the community circle", () => {
    let s = createRun(corpus, "renae", { seed: 1 }); // not in recovery
    const ids = eligibleActions(s, corpus).map((e) => e.id);
    expect(ids).toContain("evt_support_group"); // her path
    expect(ids).not.toContain("evt_recovery_meeting"); // recovery builds only
    const group = corpus.events["evt_support_group"];
    s = resolveChoice(s, group, group.choices[0], corpus);
    expect(milestone(s, "support")!.achieved).toBe(true);
  });
});

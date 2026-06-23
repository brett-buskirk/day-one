import { describe, it, expect } from "vitest";
import { corpus } from "../content/corpus";
import { createRun, isChoiceUnlocked, eligibleActions } from "./index";

const eligibleIds = (s: ReturnType<typeof createRun>) =>
  new Set(eligibleActions(s, corpus).map((e) => e.id));

// Phase 3: a laptop gates the *remote* skilled-work path. Marcus is certified but came
// home with no computer — qualified, and walled off (the catch-22, with a path out).
describe("the laptop (Phase 3 — the skilled-work catch-22)", () => {
  it("only the 'has it all' build comes home with a computer", () => {
    expect(createRun(corpus, "gloria", { seed: 1 }).flags.has_laptop).toBe(true);
    expect(createRun(corpus, "marcus", { seed: 1 }).flags.has_laptop).toBeFalsy();
  });

  it("Marcus is certified, but the remote dev role is locked without a computer", () => {
    const marcus = createRun(corpus, "marcus", { seed: 1 });
    expect(marcus.flags.has_cert_webdev).toBe(true);
    const onboard = corpus.events["evt_apply_job_onboarding"].choices.find((c) => c.id === "onboard_dev")!;
    expect(isChoiceUnlocked(marcus, onboard)).toBe(false); // the visible locked button: "Need a laptop"
    const withLaptop = { ...marcus, flags: { ...marcus.flags, has_laptop: true } };
    expect(isChoiceUnlocked(withLaptop, onboard)).toBe(true); // a computer opens it
  });

  it("the certified-but-computerless build can get one; the laptop-haver isn't offered it", () => {
    expect(eligibleIds(createRun(corpus, "marcus", { seed: 1 })).has("evt_get_laptop")).toBe(true);
    expect(eligibleIds(createRun(corpus, "gloria", { seed: 1 })).has("evt_get_laptop")).toBe(false);
  });
});

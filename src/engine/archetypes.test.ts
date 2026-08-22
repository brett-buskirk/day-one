import { describe, it, expect } from "vitest";
import { corpus } from "../content/corpus";
import { createRun, eligibleActions, resolveChoice } from "./index";

const eligibleIds = (s: ReturnType<typeof createRun>) =>
  new Set(eligibleActions(s, corpus).map((e) => e.id));

describe("the new archetypes + starting transport", () => {
  it("a build that comes home with wheels isn't offered them (the bike fix)", () => {
    const marcus = createRun(corpus, "marcus", { seed: 1 }); // starts on a bike
    expect(marcus.flags.has_bike).toBe(true);
    expect(eligibleIds(marcus).has("evt_get_bike")).toBe(false);
    // Gloria comes home with a car -> has a license -> no bike or license-restore prompts.
    const gloria = createRun(corpus, "gloria", { seed: 1 });
    expect(gloria.flags.has_license).toBe(true);
    expect(eligibleIds(gloria).has("evt_get_bike")).toBe(false);
  });

  it("'has it all' (Gloria) starts on the gentle setting", () => {
    const g = createRun(corpus, "gloria", { seed: 1 });
    expect(g.flags.has_state_id).toBe(true); // no document knot
    expect(g.flags.has_job).toBe(true); // income waiting
    expect(g.pools.money).toBeGreaterThan(60);
    expect(g.tracks.housing.status).toBe("stable");
    expect(g.standingSlots).toBe(0); // no standing slot tax
  });

  it("the young first-timer (Jaylen) is walled by inexperience, not paperwork", () => {
    const j = createRun(corpus, "jaylen", { seed: 1 });
    expect(j.flags.has_state_id).toBe(true); // documents aren't his problem
    expect(j.tracks.employment.readiness).toBeLessThan(20); // no work history is
  });

  it("the reunifying parent (Tasha) gets the custody arc", () => {
    const t = createRun(corpus, "tasha", { seed: 1 });
    expect(t.flags.reunifying).toBe(true);
    expect(t.scheduled.some((x) => x.event === "evt_custody_hearing")).toBe(true);
    expect(eligibleIds(t).has("evt_custody_visit")).toBe(true);
    // Builds without the arc never see the custody events.
    expect(eligibleIds(createRun(corpus, "marcus", { seed: 1 })).has("evt_custody_visit")).toBe(false);
  });

  it("the custody hearing gates 'make your case' on real stability", () => {
    const makeCase = corpus.events["evt_custody_hearing"].choices.find((c) => c.id === "make_the_case")!;
    expect(makeCase.requires).toEqual(
      expect.arrayContaining([
        "tracks.housing.readiness >= 3",
        "tracks.legal.readiness >= 50",
        "pools.money >= 40",
      ])
    );
  });

  it("asking for more time schedules a follow-up hearing instead of a dead end", () => {
    const t = createRun(corpus, "tasha", { seed: 1 });
    const hearing = corpus.events["evt_custody_hearing"];
    const askForTime = hearing.choices.find((c) => c.id === "ask_for_time")!;
    const after = resolveChoice(t, hearing, askForTime, corpus);

    const followup = after.scheduled.find((s) => s.event === "evt_custody_hearing_followup");
    expect(followup).toBeDefined();
    expect(followup!.onTurn).toBeGreaterThan(after.turn); // lands later, not the same week

    // The follow-up offers a real second attempt at the same gates, not a copy of the
    // first hearing re-fired (evt_custody_hearing is repeatable: false -- see #90).
    const followupEvent = corpus.events["evt_custody_hearing_followup"];
    const makeCaseAgain = followupEvent.choices.find((c) => c.id === "make_the_case_again")!;
    expect(makeCaseAgain.requires).toEqual(
      expect.arrayContaining([
        "tracks.housing.readiness >= 3",
        "tracks.legal.readiness >= 50",
        "pools.money >= 40",
      ])
    );
    expect(makeCaseAgain.outcomes[0].effects?.flags).toEqual({ custody_regained: true });
  });
});

// Engine unit tests — the non-negotiables (DESIGN §13): seedable determinism,
// serialize/load round-trip, the transport multiplier, weighted resolution, the
// predicate evaluator, and the seed-event document catch-22 chain.

import { describe, it, expect } from "vitest";
import { corpus, MARCUS_ID } from "../content/corpus";
import {
  createRun,
  chargen,
  beginTurn,
  endTurn,
  resolveChoice,
  eligibleActions,
  isChoiceUnlocked,
  canSelectChoice,
  effectiveSlotCost,
  effectiveWeight,
  rollOutcome,
  isRunOver,
  serializeRun,
  loadRun,
} from "./engine";
import { evalPredicate } from "./predicate";
import { next as rngNext } from "./rng";
import type { Choice, GameEvent, GameState } from "./types";

const choiceOf = (eventId: string, choiceId: string): [GameEvent, Choice] => {
  const e = corpus.events[eventId];
  const c = e.choices.find((x) => x.id === choiceId)!;
  return [e, c];
};

describe("chargen(Marcus)", () => {
  const s = chargen(corpus.characters[MARCUS_ID], { seed: 1 });
  it("derives the documented opening pools", () => {
    expect(s.pools).toEqual({
      money: 15,
      morale: 40,
      social_capital: 20,
      transportation: 18,
      health: 45,
    });
  });
  it("pre-spends one standing-commitment slot (mandated treatment)", () => {
    expect(s.baseSlots).toBe(6);
    expect(s.standingSlots).toBe(1);
    expect(s.slots).toBe(5);
  });
  it("sets the opening tracks and flags", () => {
    expect(s.tracks.housing.status).toBe("couch");
    expect(s.tracks.legal.status).toBe("parole");
    expect(s.tracks.employment.status).toBe("unemployed");
    expect(s.tracks.relationships.status).toBe("one_tie");
    expect(s.flags.has_cert_webdev).toBe(true);
    expect(s.flags.in_recovery_support).toBe(true);
    expect(s.flags.has_state_id).toBeUndefined();
  });
  it("schedules rent crises from the housing clock", () => {
    expect(s.scheduled.filter((x) => x.event === "evt_rent_due").map((x) => x.onTurn)).toEqual([
      4, 8, 12,
    ]);
  });
});

describe("predicate evaluator", () => {
  const s = createRun(corpus, MARCUS_ID, { seed: 1 });
  it("reads unknown flags as false and known flags correctly", () => {
    expect(evalPredicate(s, "flags.has_state_id == false")).toBe(true);
    expect(evalPredicate(s, "flags.has_cert_webdev == true")).toBe(true);
    expect(evalPredicate(s, "flags.totally_made_up == false")).toBe(true);
  });
  it("compares pools, tracks, turn, and quoted strings", () => {
    expect(evalPredicate(s, "pools.money >= 10")).toBe(true);
    expect(evalPredicate(s, "pools.money >= 30")).toBe(false);
    expect(evalPredicate(s, 'tracks.housing.status == "couch"')).toBe(true);
    expect(evalPredicate(s, 'tracks.legal.status != "unsupervised"')).toBe(true);
    expect(evalPredicate(s, "turn >= 1")).toBe(true);
  });
});

describe("seedable RNG determinism", () => {
  it("produces the same value+state for the same input state", () => {
    expect(rngNext(123)).toEqual(rngNext(123));
  });
  it("advances and varies across draws", () => {
    const a = rngNext(123);
    const b = rngNext(a.state);
    expect(a.value).not.toBe(b.value);
    expect(a.state).not.toBe(b.state);
  });
  it("same seed + same inputs ⇒ identical run state", () => {
    const a = createRun(corpus, MARCUS_ID, { seed: 99 });
    const b = createRun(corpus, MARCUS_ID, { seed: 99 });
    expect(serializeRun(a)).toBe(serializeRun(b));
  });
  it("resolving the same choice from the same state is deterministic", () => {
    const s = createRun(corpus, MARCUS_ID, { seed: 7 });
    const [e, c] = choiceOf("evt_dmv_state_id", "try_anyway");
    expect(serializeRun(resolveChoice(s, e, c, corpus))).toBe(
      serializeRun(resolveChoice(s, e, c, corpus))
    );
  });
});

describe("transportation slot multiplier (§4)", () => {
  const base = createRun(corpus, MARCUS_ID, { seed: 1 });
  const travelChoice: Choice = { id: "x", label: "x", cost: { slots: 1 }, outcomes: [] };
  const travelEvent = { id: "evt_x", kind: "action", title: "x", requires_travel: true, prompt: "x", choices: [] } as GameEvent;
  const at = (t: number): GameState => ({ ...base, pools: { ...base.pools, transportation: t } });
  it("×1 with a reliable car (≥70)", () => {
    expect(effectiveSlotCost(at(80), travelEvent, travelChoice)).toBe(1);
  });
  it("×1.5 on a bus pass (30–69), rounded up", () => {
    expect(effectiveSlotCost(at(45), travelEvent, travelChoice)).toBe(2);
  });
  it("×2 on a bike (<30) — the grind", () => {
    expect(effectiveSlotCost(at(18), travelEvent, travelChoice)).toBe(2);
  });
  it("does not multiply non-travel events", () => {
    const nonTravel = { ...travelEvent, requires_travel: false };
    expect(effectiveSlotCost(at(18), nonTravel, travelChoice)).toBe(1);
  });
});

describe("weighted outcome resolution (§9)", () => {
  it("tilts effective weight by stat (monotonic, clamped ≥0)", () => {
    const pools = createRun(corpus, MARCUS_ID, { seed: 1 }).pools; // social_capital 20
    const turnedAway = { weight: 80, modifier: { stat: "social_capital", scale: -0.3 } as const, effects: { text: "" } };
    const pity = { weight: 20, modifier: { stat: "social_capital", scale: 0.3 } as const, effects: { text: "" } };
    expect(effectiveWeight(turnedAway, pools)).toBeCloseTo(89, 5); // 80 + (20-50)*-0.3
    expect(effectiveWeight(pity, pools)).toBeCloseTo(11, 5); // 20 + (20-50)*0.3
  });
  it("selects within the outcome set and advances rng exactly once", () => {
    const outcomes = corpus.events["evt_dmv_state_id"].choices.find((c) => c.id === "try_anyway")!.outcomes;
    const pools = createRun(corpus, MARCUS_ID, { seed: 5 }).pools;
    const { outcome, rngState } = rollOutcome(outcomes, pools, 12345);
    expect(outcomes).toContain(outcome);
    expect(rngState).toBe(rngNext(12345).state);
  });
});

describe("serialize / load round-trip (§13)", () => {
  it("round-trips a mid-run state exactly", () => {
    let s = createRun(corpus, MARCUS_ID, { seed: 3 });
    const [e, c] = choiceOf("evt_parole_checkin", "make_checkin");
    s = resolveChoice(s, e, c, corpus);
    expect(loadRun(serializeRun(s))).toEqual(s);
  });
  it("rejects an incompatible payload", () => {
    expect(() => loadRun(JSON.stringify({ state: {} }))).toThrow();
  });
});

describe("the document catch-22 chains end-to-end (§9)", () => {
  it("order cert → arrives → proof → DMV unlock → ID → job onboarding", () => {
    let s = createRun(corpus, MARCUS_ID, { seed: 11 });

    // Catch-22: the prepared DMV path is visible but locked at the start.
    const [dmv, applyPrepared] = choiceOf("evt_dmv_state_id", "apply_prepared");
    expect(isChoiceUnlocked(s, applyPrepared)).toBe(false);

    // Give the player the money the seed economy gates these moves behind.
    s = { ...s, pools: { ...s.pools, money: 60 } };

    // Order the birth certificate by mail → schedules its arrival (+3 turns).
    const [, orderByMail] = choiceOf("evt_dmv_state_id", "order_by_mail");
    expect(canSelectChoice(s, dmv, orderByMail)).toBe(true);
    s = resolveChoice(s, dmv, orderByMail, corpus);
    expect(s.flags.birth_cert_ordered).toBe(true);
    expect(s.scheduled.some((x) => x.event === "evt_birth_cert_arrives" && x.onTurn === 4)).toBe(true);

    // Establish proof of address (deterministic single-outcome path).
    const [proofEvent, shelterLetter] = choiceOf("evt_proof_of_address", "shelter_letter");
    s = resolveChoice(s, proofEvent, shelterLetter, corpus);
    expect(s.flags.has_proof_of_address).toBe(true);

    // Advance to turn 4; beginTurn fires the scheduled incidents into `pending`.
    while (s.turn < 4) {
      s = endTurn(s, corpus);
      s = beginTurn(s, corpus);
    }
    expect(s.pending).toContain("evt_birth_cert_arrives");
    expect(s.pending).toContain("evt_rent_due");

    // The mail comes → has_birth_cert.
    const [certEvent, openIt] = choiceOf("evt_birth_cert_arrives", "open_it");
    s = resolveChoice(s, certEvent, openIt, corpus);
    expect(s.flags.has_birth_cert).toBe(true);
    expect(s.pending).not.toContain("evt_birth_cert_arrives");

    // Now the prepared DMV path unlocks (birth cert + proof + money ≥ 30).
    s = { ...s, pools: { ...s.pools, money: 40 } };
    expect(canSelectChoice(s, dmv, applyPrepared)).toBe(true);
    s = resolveChoice(s, dmv, applyPrepared, corpus);
    expect(s.flags.has_state_id).toBe(true);
    expect(s.flags["evt_apply_job_onboarding_unlocked"]).toBe(true);

    // The payoff event is now eligible, where the web-dev cert finally matters.
    const jobNowEligible = eligibleActions(s, corpus).some((e) => e.id === "evt_apply_job_onboarding");
    expect(jobNowEligible).toBe(true);

    // The remote dev role also needs a computer (the Phase 3 catch-22, covered in
    // laptop.test.ts); grant it so this document-chain test reaches the payoff.
    s = { ...s, flags: { ...s.flags, has_laptop: true } };
    const [jobEvent, onboard] = choiceOf("evt_apply_job_onboarding", "onboard_dev");
    s = resolveChoice(s, jobEvent, onboard, corpus);
    // Either employed (paycheck) or interviewing (background check stall) — both
    // move employment off "unemployed". No fail screen either way.
    expect(s.tracks.employment.status).not.toBe("unemployed");
  });
});

describe("an event is actionable at most once per turn (§4)", () => {
  it("the parole check-in disappears after use this week, returns next week", () => {
    let s = createRun(corpus, MARCUS_ID, { seed: 4 });
    const isEligible = (id: string) => eligibleActions(s, corpus).some((e) => e.id === id);

    expect(isEligible("evt_parole_checkin")).toBe(true);
    const [checkin, makeCheckin] = choiceOf("evt_parole_checkin", "make_checkin");
    s = resolveChoice(s, checkin, makeCheckin, corpus);

    // Same week: gone (can't grind the same obligation repeatedly).
    expect(isEligible("evt_parole_checkin")).toBe(false);
    expect(s.actedThisTurn).toContain("evt_parole_checkin");

    // Next week: available again (it's a weekly obligation).
    s = beginTurn(endTurn(s, corpus), corpus);
    expect(s.actedThisTurn).toEqual([]);
    expect(isEligible("evt_parole_checkin")).toBe(true);
  });
});

describe("setbacks, not game-overs (§10)", () => {
  it("a rent crisis always has a free way through and never ends the run", () => {
    let s = createRun(corpus, MARCUS_ID, { seed: 2 });
    while (s.turn < 4) {
      s = endTurn(s, corpus);
      s = beginTurn(s, corpus);
    }
    expect(s.pending).toContain("evt_rent_due");
    const [rent, giveUp] = choiceOf("evt_rent_due", "give_something_up");
    expect(canSelectChoice(s, rent, giveUp)).toBe(true); // free, always available
    s = resolveChoice(s, rent, giveUp, corpus);
    expect(isRunOver(s)).toBe(false);
  });
  it("the run ends only after the last playable turn", () => {
    const s = createRun(corpus, MARCUS_ID, { seed: 1 });
    expect(isRunOver({ ...s, turn: 13 })).toBe(false);
    expect(isRunOver({ ...s, turn: 14 })).toBe(true);
  });
});

// Day One — simulation engine (DESIGN §4, §9, §13).
//
// Pure functions over plain JSON-safe state: no React, no I/O, no globals.
// Every mutating function clones its input (structuredClone) and returns a new
// state, so callers can treat states as immutable snapshots. All randomness
// flows through GameState.rngState via rng.next — same seed + same inputs ⇒
// same run.

import type {
  CharacterOrigin,
  Choice,
  Corpus,
  Effect,
  GameEvent,
  GameState,
  Outcome,
  Pools,
} from "./types";
import { evalAll } from "./predicate";
import { next as rngNext } from "./rng";
import { chargen, type ChargenOptions } from "./chargen";
import {
  BASE_SLOTS,
  POOL_BASELINE,
  CRISIS_TRIGGERS,
  OBLIGATION_MISS_READINESS_PENALTY,
  violationEventFor,
  TERMINAL_VIOLATIONS,
  MONTH_TURNS,
  BENEFITS_STIPEND,
  TRANSIT_FEE,
  TRANSIT_LAPSE_DROP,
  SUPERVISION_FEE,
  WEEKLY_WAGE,
  HOME_DETENTION_FEE,
  PHONE_PLAN_FEE,
  PHONE_LAPSE_MORALE_DROP,
  COURT_GARNISHMENT,
  COURT_GARNISHMENT_MORALE,
  COURT_SUMMONS_AFTER,
  clampPool,
  transportFactor,
  housingRank,
} from "./tuning";

/* ------------------------------------------------------------------ */
/* Slot costs and the transportation multiplier (§4)                   */
/* ------------------------------------------------------------------ */

// Effective slot cost = ceil(baseCost × transportFactor) for travel events.
export function effectiveSlotCost(state: GameState, event: GameEvent, choice: Choice): number {
  const base = choice.cost?.slots ?? 0;
  if (!event.requires_travel) return base;
  return Math.ceil(base * transportFactor(state.pools.transportation));
}

export { transportFactor };

/* ------------------------------------------------------------------ */
/* Eligibility, locking, affordability                                 */
/* ------------------------------------------------------------------ */

// A choice is "unlocked" when all its `requires` pass. Locked choices are still
// shown to the player (disabled) — the catch-22 made mechanical (§9).
export function isChoiceUnlocked(state: GameState, choice: Choice): boolean {
  return evalAll(state, choice.requires);
}

// Affordability is separate from locking so the UI can explain *why* a choice
// can't be taken (need a document vs. out of slots vs. out of money).
export function isChoiceAffordable(state: GameState, event: GameEvent, choice: Choice): boolean {
  const slotCost = effectiveSlotCost(state, event, choice);
  const moneyCost = choice.cost?.money ?? 0;
  return slotCost <= state.slots && moneyCost <= state.pools.money;
}

export function canSelectChoice(state: GameState, event: GameEvent, choice: Choice): boolean {
  return isChoiceUnlocked(state, choice) && isChoiceAffordable(state, event, choice);
}

// Eligible discretionary actions: kind=action, all conditions pass, and not
// already completed unless repeatable. Incidents are surfaced via `pending`.
export function eligibleActions(state: GameState, corpus: Corpus): GameEvent[] {
  const actedThisTurn = state.actedThisTurn ?? [];
  return Object.values(corpus.events).filter((e) => {
    if (e.kind !== "action") return false;
    if (!e.repeatable && state.completed.includes(e.id)) return false;
    // Each event is actionable at most once per turn (a completed weekly
    // obligation shouldn't reappear until next week).
    if (actedThisTurn.includes(e.id)) return false;
    // Don't double-present something already surfaced as a forced incident.
    if (state.pending.includes(e.id)) return false;
    return evalAll(state, e.conditions);
  });
}

// Incidents that fired this turn and await resolution (forced cards).
export function pendingEvents(state: GameState, corpus: Corpus): GameEvent[] {
  return state.pending.map((id) => corpus.events[id]).filter((e): e is GameEvent => Boolean(e));
}

// Obligations (tag: "obligation") are auto-presented each turn they're due and
// carry a consequence if the week ends without them done (§4).
export function isObligation(event: GameEvent): boolean {
  return (event.tags ?? []).includes("obligation");
}

export function dueObligations(state: GameState, corpus: Corpus): GameEvent[] {
  return eligibleActions(state, corpus).filter(isObligation);
}

/* ------------------------------------------------------------------ */
/* Weighted outcome resolution (§9)                                    */
/* ------------------------------------------------------------------ */

// effectiveWeight = max(0, weight + (pools[stat] - 50) * scale). Monotonic,
// clamped to ≥ 0, so a stat tilts the odds without making the game pure RNG.
export function effectiveWeight(outcome: Outcome, pools: Pools): number {
  let w = outcome.weight;
  if (outcome.modifier) {
    w += (pools[outcome.modifier.stat] - POOL_BASELINE) * outcome.modifier.scale;
  }
  return Math.max(0, w);
}

// Pick one outcome by weight using exactly one PRNG draw, returning the advanced
// rng state. Deterministic for a given (outcomes, pools, rngState).
export function rollOutcome(
  outcomes: Outcome[],
  pools: Pools,
  rngState: number
): { outcome: Outcome; rngState: number } {
  const { value, state } = rngNext(rngState);
  const weights = outcomes.map((o) => effectiveWeight(o, pools));
  const total = weights.reduce((a, b) => a + b, 0);

  if (total <= 0) {
    // All weights collapsed to 0 — fall back to the last outcome deterministically.
    return { outcome: outcomes[outcomes.length - 1], rngState: state };
  }

  let pick = value * total;
  for (let i = 0; i < outcomes.length; i++) {
    pick -= weights[i];
    if (pick < 0) return { outcome: outcomes[i], rngState: state };
  }
  return { outcome: outcomes[outcomes.length - 1], rngState: state };
}

/* ------------------------------------------------------------------ */
/* Effect application (§9 — the consequence verbs)                     */
/* ------------------------------------------------------------------ */

// Mutates a (cloned) state in place. Pool deltas clamp to [0,100]; track
// `status` is set absolutely while `readiness` applies as a clamped delta (the
// seed content uses negative readiness, which can only be a delta).
function applyEffect(state: GameState, effect: Effect): void {
  if (effect.pools) {
    for (const [k, delta] of Object.entries(effect.pools)) {
      const key = k as keyof Pools;
      state.pools[key] = clampPool(state.pools[key] + (delta ?? 0));
    }
  }

  if (effect.flags) {
    for (const [name, val] of Object.entries(effect.flags)) state.flags[name] = val;
  }

  if (effect.tracks) {
    for (const [trackName, change] of Object.entries(effect.tracks)) {
      if (!change) continue;
      const track = state.tracks[trackName as keyof GameState["tracks"]];
      if (change.status !== undefined) track.status = change.status;
      if (change.readiness !== undefined) {
        track.readiness = clampPool((track.readiness ?? 0) + change.readiness);
      }
      // Housing readiness IS the ladder rank — keep it in sync with the status so
      // content can gate a rung on `tracks.housing.readiness < N` (§6).
      if (trackName === "housing" && change.status !== undefined) {
        track.readiness = housingRank(change.status);
      }
    }
  }

  // unlocks: sugar for an explicit gate beyond `conditions` — set <id>_unlocked
  // so an event can require it (DESIGN §9).
  if (effect.unlocks) {
    for (const id of effect.unlocks) state.flags[`${id}_unlocked`] = true;
  }

  if (effect.schedule) {
    state.scheduled.push({
      event: effect.schedule.event,
      onTurn: state.turn + effect.schedule.in_turns,
    });
  }

  if (effect.slots !== undefined) {
    state.slots = Math.max(0, state.slots + effect.slots);
  }
}

/* ------------------------------------------------------------------ */
/* Turn loop (§4)                                                      */
/* ------------------------------------------------------------------ */

// Step 1: replenish slots, fire scheduled incidents into `pending`, surface
// obligations (obligations are eligible actions in Sprint 1; enforcement of a
// missed obligation lands in Sprint 2). Does no RNG — pure and idempotent if
// called once per turn.
export function beginTurn(state: GameState, corpus: Corpus): GameState {
  const s = structuredClone(state);
  s.slots = Math.max(0, s.baseSlots - s.standingSlots);
  s.actedThisTurn = []; // fresh week: repeatable actions are available again

  const due = s.scheduled.filter((sc) => sc.onTurn === s.turn);
  s.scheduled = s.scheduled.filter((sc) => sc.onTurn !== s.turn);

  for (const sc of due) {
    const event = corpus.events[sc.event];
    if (!event) continue; // dangling schedule target — ignore
    // A non-repeatable incident that already happened does not re-fire.
    if (event.repeatable === false && s.completed.includes(event.id)) continue;
    if (!s.pending.includes(event.id)) s.pending.push(event.id);
  }

  // Weekly income/costs start from week 2 — week 1 is the opening state, so a build's
  // starting money is its chargen money (the monthly flows already skip turn 1 this way).
  if (s.turn > 1) {
    applyWeeklyWage(s);
    applyWeeklyFees(s);
    applyCourtDebt(s); // weekly garnishment off the paycheck, escalating to a warrant
  }
  applyMonthlyFlows(s);

  return s;
}

// Home-detention monitoring fee — a relentless WEEKLY drain while supervised at home.
// Takes what it can if you're short (the shortfall is its own pressure, caught by the
// money-floor crisis). Logged so the cost is attributable, never arbitrary.
function applyWeeklyFees(s: GameState): void {
  if (!s.flags.owes_home_detention_fees) return;
  const paid = Math.min(HOME_DETENTION_FEE, s.pools.money);
  s.pools.money = clampPool(s.pools.money - paid);
  s.log.push({
    turn: s.turn,
    eventId: "system",
    choiceId: "home_detention_fee",
    text:
      paid >= HOME_DETENTION_FEE
        ? `Home-detention monitoring fee (−${HOME_DETENTION_FEE}). The cost of being watched at home.`
        : `Home-detention fee due (−${HOME_DETENTION_FEE}); you could only cover ${paid}. The arrears follow you.`,
  });
}

// A steady weekly paycheck while employed — the income that makes landing a job worth
// it (its absence made "get a job" an economic dead-end: day labor retires on has_job,
// but a job paid nothing recurring). Deterministic; logged so the player attributes it.
function applyWeeklyWage(s: GameState): void {
  if (!s.flags.has_job) return;
  s.pools.money = clampPool(s.pools.money + WEEKLY_WAGE);
  s.log.push({
    turn: s.turn,
    eventId: "system",
    choiceId: "paycheck",
    text: `Paycheck from the job landed (+${WEEKLY_WAGE}).`,
  });
}

// Step 2–3: take a choice, deduct cost, roll the outcome, apply effects, log.
export function resolveChoice(
  state: GameState,
  event: GameEvent,
  choice: Choice,
  _corpus: Corpus
): GameState {
  if (!isChoiceUnlocked(state, choice)) {
    throw new Error(`Choice "${choice.id}" is locked (requires not met).`);
  }
  if (!isChoiceAffordable(state, event, choice)) {
    throw new Error(`Choice "${choice.id}" is unaffordable (slots/money).`);
  }

  const s = structuredClone(state);

  // Deduct costs (slot cost includes the transport multiplier).
  s.slots = Math.max(0, s.slots - effectiveSlotCost(state, event, choice));
  s.pools.money = clampPool(s.pools.money - (choice.cost?.money ?? 0));

  // Roll one outcome against the post-cost pools and advance the PRNG.
  const { outcome, rngState } = rollOutcome(choice.outcomes, s.pools, s.rngState);
  s.rngState = rngState;

  applyEffect(s, outcome.effects);

  s.log.push({
    turn: s.turn,
    eventId: event.id,
    choiceId: choice.id,
    text: outcome.effects.text,
    ...(choice.quality ? { quality: choice.quality } : {}),
  });

  if (event.repeatable !== true && !s.completed.includes(event.id)) {
    s.completed.push(event.id);
  }
  if (!s.actedThisTurn.includes(event.id)) s.actedThisTurn.push(event.id);
  s.pending = s.pending.filter((id) => id !== event.id);

  return s;
}

// Recurring monthly money flows (§ tuning): standing income/costs that fire at
// the start of each month, gated by flags. Deterministic; logged so the player
// sees the money move.
function applyMonthlyFlows(s: GameState): void {
  if (s.turn % MONTH_TURNS !== 0) return; // monthly tick: turns 4, 8, 12

  if (s.flags.has_benefits) {
    s.pools.money = clampPool(s.pools.money + BENEFITS_STIPEND);
    s.log.push({
      turn: s.turn,
      eventId: "system",
      choiceId: "benefits",
      text: `Benefits deposit landed (+${BENEFITS_STIPEND}) — a little cushion for the month.`,
    });
  }

  if (s.flags.has_transit_pass) {
    if (s.pools.money >= TRANSIT_FEE) {
      s.pools.money = clampPool(s.pools.money - TRANSIT_FEE);
      s.log.push({
        turn: s.turn,
        eventId: "system",
        choiceId: "pass_renew",
        text: `Renewed the transit pass (−${TRANSIT_FEE}).`,
      });
    } else {
      s.flags.has_transit_pass = false;
      s.pools.transportation = clampPool(s.pools.transportation - TRANSIT_LAPSE_DROP);
      s.log.push({
        turn: s.turn,
        eventId: "system",
        choiceId: "pass_lapse",
        text: "The transit pass lapsed — you couldn't cover the fare. Back to the long way around.",
      });
    }
  }

  // Probation supervision fees — a standing monthly cost of being supervised.
  if (s.flags.owes_supervision_fees) {
    const paid = Math.min(SUPERVISION_FEE, s.pools.money);
    s.pools.money = clampPool(s.pools.money - paid);
    s.log.push({
      turn: s.turn,
      eventId: "system",
      choiceId: "supervision_fees",
      text:
        paid >= SUPERVISION_FEE
          ? `Supervision fees due (−${SUPERVISION_FEE}). The cost of being watched.`
          : `Supervision fees due — they take what little there is (−${paid}).`,
    });
  }

  // The phone's network plan — pay it, or the phone gets shut off. (A Lifeline phone has
  // no owes_phone_plan, so it's never charged here.)
  if (s.flags.owes_phone_plan) {
    if (s.pools.money >= PHONE_PLAN_FEE) {
      s.pools.money = clampPool(s.pools.money - PHONE_PLAN_FEE);
      s.log.push({
        turn: s.turn,
        eventId: "system",
        choiceId: "phone_plan",
        text: `Phone plan due (−${PHONE_PLAN_FEE}). Staying reachable isn't free.`,
      });
    } else {
      s.flags.has_phone = false;
      s.flags.owes_phone_plan = false;
      s.pools.morale = clampPool(s.pools.morale - PHONE_LAPSE_MORALE_DROP);
      s.log.push({
        turn: s.turn,
        eventId: "system",
        choiceId: "phone_lapse",
        text: "Your phone got shut off — you couldn't cover the plan. Off the grid, and harder to reach.",
      });
    }
  }
}

// Court debt (LFOs), a WEEKLY consequence: ignore the balance once you're earning and the
// court garnishes each paycheck — visible every week, not a quiet monthly nibble. Let it
// ride ~a month and it escalates to a bench warrant (evt_court_summons). A payment plan
// (evt_court_debt) sets on_payment_plan = compliance, so none of this fires.
function applyCourtDebt(s: GameState): void {
  if (!(s.flags.owes_court_debt && s.flags.has_job && !s.flags.on_payment_plan)) return;
  const paid = Math.min(COURT_GARNISHMENT, s.pools.money);
  s.pools.money = clampPool(s.pools.money - paid);
  s.pools.morale = clampPool(s.pools.morale - COURT_GARNISHMENT_MORALE);
  s.log.push({
    turn: s.turn,
    eventId: "system",
    choiceId: "court_garnishment",
    text: `The court garnished your paycheck (−${paid}) for the balance you've been ignoring.`,
  });
  // Sustained ignoring escalates to a bench warrant — fired once.
  const garnishments = s.log.filter((l) => l.choiceId === "court_garnishment").length;
  if (garnishments >= COURT_SUMMONS_AFTER && !s.completed.includes("evt_court_summons")) {
    queueIncident(s, "evt_court_summons", s.turn + 1);
  }
}

// Schedule an incident, de-duplicated: skip if it's already queued or pending.
function queueIncident(s: GameState, eventId: string, onTurn: number): void {
  if (s.scheduled.some((sc) => sc.event === eventId)) return;
  if (s.pending.includes(eventId)) return;
  s.scheduled.push({ event: eventId, onTurn });
}

// Step 4 (§4): enforce missed obligations, fire pool-floor crises, snapshot the
// pools, handle the rare terminal chain, then advance the week.
export function endTurn(state: GameState, corpus: Corpus): GameState {
  const s = structuredClone(state);

  // (a) Missed obligations → standing slips, a violation is filed, the
  // recoverable sub-arc is scheduled for next week.
  for (const ob of dueObligations(s, corpus)) {
    s.violations += 1;
    const legal = s.tracks.legal;
    legal.readiness = clampPool((legal.readiness ?? 0) - OBLIGATION_MISS_READINESS_PENALTY);
    queueIncident(s, violationEventFor(legal.status), s.turn + 1);
    s.log.push({
      turn: s.turn,
      eventId: ob.id,
      choiceId: "missed",
      text: `You didn't make your ${ob.title.toLowerCase()} this week. A technical violation is in motion.`,
    });
  }

  // (b) Pool-floor crises, edge-triggered against last week's snapshot so a low
  // pool fires once on the way down rather than every week (§4 step 4, §10).
  const prev = s.poolHistory[s.poolHistory.length - 1]?.pools;
  if (prev) {
    for (const trig of CRISIS_TRIGGERS) {
      if (prev[trig.pool] > trig.floor && s.pools[trig.pool] <= trig.floor) {
        queueIncident(s, trig.event, s.turn + 1);
      }
    }
  }

  // (c) Record this week's end-of-turn snapshot for trajectory scoring.
  s.poolHistory.push({ turn: s.turn, pools: { ...s.pools } });

  // (d) Terminal chain (§10): reachable only from *accumulated* violations and
  // only when hardFail is on (empathy mode). Training never ends early — it
  // carries the strain into the day-90 debrief instead.
  if (s.config.hardFail && s.violations >= TERMINAL_VIOLATIONS && !s.terminal) {
    s.terminal = true;
    s.log.push({
      turn: s.turn,
      eventId: "system",
      choiceId: "terminal",
      text: "Accumulated violations trigger a revocation. The road forward closes here — for now.",
    });
  }

  s.turn += 1;
  return s;
}

export function isRunOver(state: GameState): boolean {
  return state.turn > state.endTurn || state.terminal === true;
}

/* ------------------------------------------------------------------ */
/* Run creation + serialization (§13)                                  */
/* ------------------------------------------------------------------ */

// Chargen an explicit origin (corpus, random, or otherwise) and fire turn 1.
export function createRunFromOrigin(
  corpus: Corpus,
  origin: CharacterOrigin,
  opts: ChargenOptions
): GameState {
  return beginTurn(chargen(origin, opts), corpus);
}

// Convenience: chargen a character from the corpus and fire turn 1's begin step.
export function createRun(
  corpus: Corpus,
  characterId: string,
  opts: ChargenOptions
): GameState {
  const origin = corpus.characters[characterId];
  if (!origin) throw new Error(`Unknown character "${characterId}"`);
  return createRunFromOrigin(corpus, origin, opts);
}

const SAVE_VERSION = 1;

// JSON-safe by construction (DESIGN §13). The envelope carries a version so
// saved runs can be migrated later.
export function serializeRun(state: GameState): string {
  return JSON.stringify({ __dayone: SAVE_VERSION, state });
}

export function loadRun(serialized: string): GameState {
  const parsed = JSON.parse(serialized) as { __dayone?: number; state?: GameState };
  if (parsed.__dayone !== SAVE_VERSION || !parsed.state) {
    throw new Error("Unrecognized or incompatible saved run.");
  }
  // Forward-compat: default fields added after a save was written.
  const st = parsed.state;
  if (!st.actedThisTurn) st.actedThisTurn = [];
  if (!st.poolHistory) st.poolHistory = [{ turn: 0, pools: st.pools }];
  if (st.violations === undefined) st.violations = 0;
  if (st.terminal === undefined) st.terminal = false;
  // Housing readiness is the ladder rank (added later) — derive it from the status
  // for saves written before the housing ladder existed.
  if (st.tracks?.housing && st.tracks.housing.readiness === undefined) {
    st.tracks.housing.readiness = housingRank(st.tracks.housing.status);
  }
  return st;
}

export { chargen, BASE_SLOTS };

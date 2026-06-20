// chargen(origin) -> opening GameState (DESIGN §8). The origin is the authored
// human story; chargen derives the starting pools, tracks, and flags from it so
// new characters are authored as data, not code. The derivation below is
// principled and documented; it reproduces the Marcus mapping in
// content/characters/marcus.yaml. All numbers are tuning.

import type { CharacterOrigin, Flags, GameState, Pools, Tracks } from "./types";
import { BASE_SLOTS, END_TURN, clampPool } from "./tuning";
import { seedToState } from "./rng";

const SUPPORT_TO_CAPITAL: Record<string, number> = {
  isolated: 8,
  strained: 15,
  one_tie: 20,
  supported: 45,
  network: 70,
};

const SUPPORT_TO_RELATIONSHIP: Record<string, string> = {
  isolated: "isolated",
  strained: "strained",
  one_tie: "one_tie",
  supported: "supported",
  network: "network",
};

const TRANSPORT_TO_POOL: Record<string, number> = {
  car: 80,
  bus_pass: 45,
  bike: 18,
  none: 8,
};

const SUPERVISION_TO_LEGAL: Record<string, string> = {
  parole: "parole",
  probation: "probation",
  none: "unsupervised",
};

// Standing commitments that levy a per-week slot tax but have no interactive
// event yet (Sprint 1). The weekly check-in is modeled as the interactive
// evt_parole_checkin action instead, so it is NOT pre-spent here (no double
// counting). See docs/DESIGN.md §4 and the marcus.yaml chargen notes.
const COMMITMENT_SLOT_COST: Record<string, number> = {
  mandated_treatment: 1,
  curfew: 0,
  weekly_checkin: 0,
};

function derivePools(origin: CharacterOrigin): Pools {
  const { landing, person, time_inside_years } = origin;

  // gate_money ($) -> money pool (Marcus: $120 -> 15).
  const money = clampPool(landing.gate_money / 8);

  // Fresh out, motivated but fragile; longer inside is more disorienting
  // (Marcus: 6 yrs -> 40).
  const morale = clampPool(50 - time_inside_years * 1.6);

  const social_capital = clampPool(SUPPORT_TO_CAPITAL[landing.support] ?? 20);
  const transportation = clampPool(TRANSPORT_TO_POOL[landing.transportation] ?? 20);

  // Recovery + chronic issues drag baseline wellbeing (Marcus: 60-8-7 = 45).
  let health = 60;
  if (person.in_recovery) health -= 8;
  if (person.chronic_health_issue) health -= 7;

  return {
    money,
    morale,
    social_capital,
    transportation,
    health: clampPool(health),
  };
}

function deriveTracks(origin: CharacterOrigin): Tracks {
  const { landing, person, supervision } = origin;

  // Skill present but paper trail absent -> some latent employment readiness.
  const employmentReadiness = (person.credentials?.length ?? 0) > 0 ? 40 : 10;
  const employmentStatus = landing.job_lined_up ? "offer" : "unemployed";

  return {
    employment: { status: employmentStatus, readiness: employmentReadiness },
    housing: { status: landing.night_one },
    // Legal "standing" is tracked as readiness (higher = better). Start in good
    // standing; the parole check-in nudges it up/down (Sprint 2 branches on it).
    legal: { status: SUPERVISION_TO_LEGAL[supervision.type] ?? "unsupervised", readiness: 60 },
    relationships: { status: SUPPORT_TO_RELATIONSHIP[landing.support] ?? "isolated" },
  };
}

function deriveFlags(origin: CharacterOrigin): Flags {
  const flags: Flags = {};
  // Documents the character already holds (e.g. "state_id" -> has_state_id).
  for (const doc of origin.landing.documents ?? []) flags[`has_${doc}`] = true;
  // Credentials earned inside (e.g. "cert_webdev" -> has_cert_webdev).
  for (const cred of origin.person.credentials ?? []) flags[`has_${cred}`] = true;
  if (origin.person.in_recovery) flags.in_recovery_support = true;
  if (origin.landing.job_lined_up) flags.has_job = true;
  return flags;
}

function deriveStandingSlots(origin: CharacterOrigin): number {
  return (origin.supervision.conditions ?? []).reduce(
    (sum, c) => sum + (COMMITMENT_SLOT_COST[c] ?? 0),
    0
  );
}

// The first rent crisis lands when the welcome runs out, then recurs on that
// cadence. Modeled as scheduled incidents derived from the housing clock rather
// than hardcoded, so it stays data-driven (Sprint 2 generalizes this).
function deriveSchedule(origin: CharacterOrigin): GameState["scheduled"] {
  const clock = origin.landing.housing_clock_turns;
  if (!clock || clock < 1) return [];
  const out: GameState["scheduled"] = [];
  for (let t = clock; t <= END_TURN; t += clock) {
    out.push({ event: "evt_rent_due", onTurn: t });
  }
  return out;
}

export interface ChargenOptions {
  seed: number; // determinism lives here — pass an explicit seed
  mode?: GameState["mode"];
  hardFail?: boolean;
}

export function chargen(origin: CharacterOrigin, opts: ChargenOptions): GameState {
  const standingSlots = deriveStandingSlots(origin);
  const pools = derivePools(origin);
  return {
    characterId: origin.id,
    mode: opts.mode ?? "training",
    config: { hardFail: opts.hardFail ?? false },

    turn: 1,
    endTurn: END_TURN,

    seed: opts.seed,
    rngState: seedToState(opts.seed),

    pools,
    slots: BASE_SLOTS - standingSlots,
    baseSlots: BASE_SLOTS,
    standingSlots,

    tracks: deriveTracks(origin),
    flags: deriveFlags(origin),

    completed: [],
    actedThisTurn: [],
    scheduled: deriveSchedule(origin),
    pending: [],
    log: [],

    poolHistory: [{ turn: 0, pools: { ...pools } }], // opening baseline
    violations: 0,
    terminal: false,
  };
}

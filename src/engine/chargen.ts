// chargen(origin) -> opening GameState (DESIGN §8). The origin is the authored
// human story; chargen derives the starting pools, tracks, and flags from it so
// new characters are authored as data, not code. The derivation below is
// principled and documented; it reproduces the Marcus mapping in
// content/characters/marcus.yaml. All numbers are tuning.

import type { CharacterOrigin, Flags, GameState, Pools, Tracks } from "./types";
import {
  BASE_SLOTS,
  END_TURN,
  TECH_GAP_YEARS,
  clampPool,
  housingRank,
  LIFE_EVENT_SEED_SALT,
  LIFE_EVENT_TURN_MIN,
  LIFE_EVENT_TURN_MAX,
  LIFE_EVENTS,
  HOME_VISIT_SEED_SALT,
  HOME_VISIT_TURN_MIN,
  HOME_VISIT_TURN_MAX,
  INTERRUPT_SEED_SALT,
  INTERRUPT_TURN_MIN,
  INTERRUPT_TURN_MAX,
  INTERRUPTS,
} from "./tuning";
import { seedToState, next } from "./rng";

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
  home_detention: "home_detention", // a first-class supervision status, with its own
  // check-in (evt_home_detention_checkin) and violation (evt_home_detention_violation).
  none: "unsupervised",
};

// Standing commitments that levy a per-week slot tax but have no interactive
// event yet (Sprint 1). The weekly check-in is modeled as the interactive
// evt_parole_checkin action instead, so it is NOT pre-spent here (no double
// counting). See docs/DESIGN.md §4 and the marcus.yaml chargen notes.
const COMMITMENT_SLOT_COST: Record<string, number> = {
  mandated_treatment: 1,
  community_service: 1, // court-ordered hours — a standing claim on the week
  home_detention: 1, // confined except for approved activities — a standing claim too
  curfew: 0,
  weekly_checkin: 0,
  supervision_fees: 0, // a money cost (recurring), not a slot cost
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
    housing: { status: landing.night_one, readiness: housingRank(landing.night_one) },
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
  // The getting-around they already have, placed on the transport ladder (§6) so they
  // aren't offered wheels they own — e.g. Marcus comes home on a bike. A car means both
  // the vehicle (has_car) and the license to drive it.
  const tFlags: Record<string, string[]> = {
    car: ["has_license", "has_car"],
    bus_pass: ["has_transit_pass"],
    bike: ["has_bike"],
  };
  for (const f of tFlags[origin.landing.transportation] ?? []) flags[f] = true;
  // A phone they came home with means a paid plan — a recurring bill that's hard to keep
  // up (the Lifeline subsidized phone from evt_get_phone carries no such cost). Not
  // guaranteed: plenty come home without one (the first barrier).
  if (origin.landing.has_phone) {
    flags.has_phone = true;
    flags.owes_phone_plan = true;
  }
  // A computer at home is rarer than a phone — most come home without one. It gates the
  // remote skilled-work path (the certified-but-computerless catch-22; see evt_get_laptop).
  if (origin.landing.has_laptop) flags.has_laptop = true;
  // A registry requirement is the heaviest single barrier (DESIGN §8) — it
  // reshapes housing and employment. Surfaced as a flag so content can gate on
  // it (housing/employment events become near-impossible); framed as a barrier,
  // never a moral judgment.
  if (origin.offense.registry_required) flags.registry_required = true;
  // Probation supervision fees become a standing monthly cost (recurring economy).
  if ((origin.supervision.conditions ?? []).includes("supervision_fees")) {
    flags.owes_supervision_fees = true;
  }
  // Home-detention monitoring is a standing *weekly* fee — often the most crippling cost
  // of being supervised at home.
  if ((origin.supervision.conditions ?? []).includes("home_detention")) {
    flags.owes_home_detention_fees = true;
  }
  // Legal financial obligations (fines, fees, restitution) are near-universal for the
  // justice-involved. Ignoring them once you're earning gets your wages garnished (see the
  // monthly economy); a payment plan (evt_court_debt) keeps you in compliance instead.
  flags.owes_court_debt = true;
  // A long stretch inside opens a technology gap that walls off skilled work
  // until it's closed; long-term incarceration also carries mental-health weight.
  if (origin.time_inside_years >= TECH_GAP_YEARS) flags.tech_gap = true;
  if (origin.person.mental_health_issue) flags.chronic_mental_health = true;
  // A parent fighting to regain custody — surfaced as a flag so the custody arc
  // (the hearing, the visits) can gate on it.
  if (origin.person.reunifying) flags.reunifying = true;
  return flags;
}

function deriveStandingSlots(origin: CharacterOrigin): number {
  return (origin.supervision.conditions ?? []).reduce(
    (sum, c) => sum + (COMMITMENT_SLOT_COST[c] ?? 0),
    0
  );
}

// Housing situations that actually owe rent (so a shelter/none landing doesn't
// get a "rent is due" crisis — those builds face different pressures).
const RENT_BEARING = new Set(["couch", "rental", "transitional", "halfway_house"]);

// The first rent crisis lands when the welcome runs out, then recurs on that
// cadence. Modeled as scheduled incidents derived from the housing clock rather
// than hardcoded, so it stays data-driven.
function deriveSchedule(origin: CharacterOrigin): GameState["scheduled"] {
  const out: GameState["scheduled"] = [];
  const clock = origin.landing.housing_clock_turns;
  if (clock && clock >= 1 && RENT_BEARING.has(origin.landing.night_one)) {
    for (let t = clock; t <= END_TURN; t += clock) {
      out.push({ event: "evt_rent_due", onTurn: t });
    }
  }
  // A chronic mental-health condition surfaces early as a guaranteed low point;
  // the morale-floor trigger (§ tuning) catches anyone else who crashes.
  if (origin.person.mental_health_issue) {
    out.push({ event: "evt_mental_health_crisis", onTurn: 3 });
  }
  // The reunifying parent's arc peaks at a custody hearing mid-game (week 9); the
  // stability they've built by then — housing, income, clean standing — decides it.
  if (origin.person.reunifying) {
    out.push({ event: "evt_custody_hearing", onTurn: 9 });
  }
  return out;
}

// One unexpected "life happens" beat per run — a loss or a blessing — at a
// seed-varied mid-game turn. Rolled from a salted seed (not GameState.rngState) so
// it's fully reproducible yet never perturbs the main outcome stream.
function lifeEventSchedule(seed: number): GameState["scheduled"] {
  const start = (seedToState(seed) ^ LIFE_EVENT_SEED_SALT) | 0;
  const r1 = next(start);
  const span = LIFE_EVENT_TURN_MAX - LIFE_EVENT_TURN_MIN + 1;
  const onTurn = LIFE_EVENT_TURN_MIN + Math.floor(r1.value * span);
  const r2 = next(r1.state);
  const event = LIFE_EVENTS[Math.floor(r2.value * LIFE_EVENTS.length)];
  return [{ event, onTurn }];
}

// A surprise home visit from the supervising officer — one per run for builds on paper
// (parole/probation), at a seed-varied turn. Its own salt, so it doesn't perturb the
// main stream or the life event.
function homeVisitSchedule(seed: number, origin: CharacterOrigin): GameState["scheduled"] {
  if (origin.supervision.type === "none") return []; // no officer, no visit
  const r = next((seedToState(seed) ^ HOME_VISIT_SEED_SALT) | 0);
  const span = HOME_VISIT_TURN_MAX - HOME_VISIT_TURN_MIN + 1;
  const onTurn = HOME_VISIT_TURN_MIN + Math.floor(r.value * span);
  return [{ event: "evt_home_visit", onTurn }];
}

// A second random interrupt per run — pulled in a direction you didn't plan — drawn from
// the INTERRUPTS pool at a seed-varied turn (its own salt). State-agnostic, so it fires
// for any build.
function interruptSchedule(seed: number): GameState["scheduled"] {
  const r1 = next((seedToState(seed) ^ INTERRUPT_SEED_SALT) | 0);
  const span = INTERRUPT_TURN_MAX - INTERRUPT_TURN_MIN + 1;
  const onTurn = INTERRUPT_TURN_MIN + Math.floor(r1.value * span);
  const r2 = next(r1.state);
  const event = INTERRUPTS[Math.floor(r2.value * INTERRUPTS.length)];
  return [{ event, onTurn }];
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
    scheduled: [
      ...deriveSchedule(origin),
      ...lifeEventSchedule(opts.seed),
      ...homeVisitSchedule(opts.seed, origin),
      ...interruptSchedule(opts.seed),
    ],
    pending: [],
    log: [],

    poolHistory: [{ turn: 0, pools: { ...pools } }], // opening baseline
    violations: 0,
    terminal: false,
  };
}

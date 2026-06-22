// Tuning knobs. DESIGN: "Where it says 'tuning,' the exact number is a knob to
// balance later, not a thing to block on." Centralized so balancing is one file.

import type { PoolKey } from "./types";

// Turn loop (§4)
export const BASE_SLOTS = 6; // discretionary slots/week before commitments
export const END_TURN = 13; // ~90 days; turns 1..13 are playable

// Transportation slot multiplier (§4). Effective cost = ceil(base × factor).
export function transportFactor(transportation: number): number {
  if (transportation >= 70) return 1; // reliable car
  if (transportation >= 30) return 1.5; // bus pass / borrowed
  return 2; // bike / intermittent
}

// Housing ladder (§6): which housing state is "better." Kept in sync with
// tracks.housing.status as the track's readiness (see engine applyEffect/chargen),
// so content can gate a housing rung on `tracks.housing.readiness < N` — a move only
// ever goes *up* the ladder, and an outgrown rung stops being offered.
export const HOUSING_RANK: Record<string, number> = {
  none: 0,
  street: 0,
  shelter: 1,
  couch: 2,
  transitional: 3,
  halfway_house: 3,
  rental: 4,
  stable: 5,
};
export function housingRank(status: string): number {
  return HOUSING_RANK[status] ?? 0;
}

// Random "life happens" beat: exactly one per run, scheduled at a seed-varied
// mid-game turn (see chargen.lifeEventSchedule). The pool cuts both ways — losses
// and blessings — so a run might be knocked back or lifted up, and you never know
// which is coming. Rolled from a salted seed so it stays reproducible without
// disturbing the main outcome RNG stream.
export const LIFE_EVENT_SEED_SALT = 0x4c494645; // "LIFE"
export const LIFE_EVENT_TURN_MIN = 3;
export const LIFE_EVENT_TURN_MAX = 10;
export const LIFE_EVENTS = [
  "evt_life_loss", // a death in the support circle
  "evt_life_health", // a sudden health setback
  "evt_life_friend", // someone from before shows up for you
  "evt_life_kindness", // unexpected generosity, no strings
];

// Weighted-outcome modifier (§9): effectiveWeight = max(0, weight + (stat-50)*scale)
export const POOL_BASELINE = 50;

// Pool bounds (§5): every pool is an integer in [0, 100], clamped on write.
export const POOL_MIN = 0;
export const POOL_MAX = 100;

export function clampPool(n: number): number {
  return Math.max(POOL_MIN, Math.min(POOL_MAX, Math.round(n)));
}

// Threshold triggers (§4 step 4, §10): when a pool crosses *down* to/through a
// floor at end of turn, schedule a crisis incident instead of ending the run.
// Edge-triggered (only on the downward crossing) so a low pool doesn't spam.
export interface CrisisTrigger {
  pool: PoolKey;
  floor: number;
  event: string;
}
export const CRISIS_TRIGGERS: CrisisTrigger[] = [
  { pool: "money", floor: 0, event: "evt_money_crisis" },
  { pool: "health", floor: 15, event: "evt_health_crisis" },
  { pool: "morale", floor: 15, event: "evt_mental_health_crisis" },
];

// A long enough stretch inside opens a wide technology gap — the world's tools
// (smartphones, online everything) moved on without you. chargen sets the
// tech_gap flag past this threshold; it gates the skilled-job routes until
// closed (evt_digital_literacy).
export const TECH_GAP_YEARS = 15;

// Obligations (§4): failing to act on a due obligation within the week costs
// standing and files a technical violation (a recoverable sub-arc). The violation
// event depends on the supervision type so parole and probation read differently.
export const OBLIGATION_MISS_READINESS_PENALTY = 15;
export const VIOLATION_EVENTS: Record<string, string> = {
  parole: "evt_parole_violation",
  probation: "evt_probation_violation",
};
export function violationEventFor(legalStatus: string): string {
  return VIOLATION_EVENTS[legalStatus] ?? "evt_parole_violation";
}

// Terminal chains (§10) are reachable only from *accumulated* violations, never
// a single slip — and only when hardFail is on (empathy mode). Training stalls
// into crisis-and-debrief instead.
export const TERMINAL_VIOLATIONS = 3;

// Recurring monthly economy: a tick at the start of each month (every MONTH_TURNS
// weeks) applies standing income/costs driven by flags. Benefits are a small
// cushion; the transit pass is a subscription that lapses if you can't cover the
// fare. Keeps the mid/late-game economy moving instead of static. (Tuning.)
export const MONTH_TURNS = 4;
export const BENEFITS_STIPEND = 8; // +money/month while has_benefits
export const TRANSIT_FEE = 8; // money/month to keep the pass
export const TRANSIT_LAPSE_DROP = 30; // transportation lost when the pass lapses
export const SUPERVISION_FEE = 6; // money/month while owes_supervision_fees (probation)

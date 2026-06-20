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
];

// Obligations (§4): failing to act on a due obligation within the week costs
// standing and files a technical violation (a recoverable sub-arc).
export const OBLIGATION_MISS_READINESS_PENALTY = 15;
export const VIOLATION_EVENT = "evt_parole_violation";

// Terminal chains (§10) are reachable only from *accumulated* violations, never
// a single slip — and only when hardFail is on (empathy mode). Training stalls
// into crisis-and-debrief instead.
export const TERMINAL_VIOLATIONS = 3;

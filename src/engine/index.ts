// Public engine surface — the only module the UI imports from. Keeps the
// React layer cleanly separated from the pure engine (DESIGN §3).

export * from "./types";
export { chargen, type ChargenOptions } from "./chargen";
export {
  createRun,
  createRunFromOrigin,
  beginTurn,
  endTurn,
  resolveChoice,
  eligibleActions,
  pendingEvents,
  isObligation,
  dueObligations,
  isChoiceUnlocked,
  isChoiceAffordable,
  canSelectChoice,
  effectiveSlotCost,
  effectiveWeight,
  rollOutcome,
  transportFactor,
  isRunOver,
  serializeRun,
  loadRun,
} from "./engine";
export {
  buildDebrief,
  type Debrief,
  type Dimension,
  type Milestone,
  type Tone,
  type Trajectory,
  type Momentum,
  type Framing,
} from "./debrief";
export { evalPredicate, evalAll, parsePredicate } from "./predicate";
export { next as rngNext, seedToState, randomSeed } from "./rng";
export { randomOrigin, RANDOM_ID } from "./randomchar";
export {
  BASE_SLOTS,
  END_TURN,
  POOL_BASELINE,
  POOL_MIN,
  POOL_MAX,
  clampPool,
} from "./tuning";
export { FLAG_REGISTRY, isKnownFlag } from "./flags";

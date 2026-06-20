// Day One — canonical engine contracts.
//
// These types are the contract between the content corpus, the engine, and the
// UI. Keep them framework-agnostic: nothing here imports React. See
// docs/DESIGN.md for the rationale behind each shape.

/* ------------------------------------------------------------------ */
/* Pools and tracks                                                    */
/* ------------------------------------------------------------------ */

export type PoolKey =
  | "money"
  | "morale"
  | "social_capital"
  | "transportation"
  | "health";

// Every pool is an integer in [0, 100], clamped on every write.
export type Pools = Record<PoolKey, number>;

export type TrackKey = "employment" | "housing" | "legal" | "relationships";

export interface TrackState {
  status: string; // see suggested status enums in docs/DESIGN.md §6
  readiness?: number; // optional 0–100 for finer movement (tuning)
}

export type Tracks = Record<TrackKey, TrackState>;

// Flat boolean map. Any unset flag reads as false. snake_case, read as a true
// statement: has_state_id, birth_cert_ordered, etc. Keep a registry to catch typos.
export type Flags = Record<string, boolean>;

/* ------------------------------------------------------------------ */
/* Modes and config                                                    */
/* ------------------------------------------------------------------ */

export type Mode = "training" | "empathy";

export interface RunConfig {
  // When false (default in training), terminal chains stall into a
  // crisis-and-debrief instead of ending the run. See docs/DESIGN.md §10.
  hardFail: boolean;
}

/* ------------------------------------------------------------------ */
/* Game state (must be JSON-serializable end to end)                   */
/* ------------------------------------------------------------------ */

export interface ScheduledEvent {
  event: string; // event id to fire
  onTurn: number; // absolute turn number when it fires
}

// Decision-quality tag (DESIGN §10): did the player take the durable path over
// the desperate one when they could? Authored per choice on meaningful forks.
export type ChoiceQuality = "durable" | "desperate" | "neutral";

export interface LogEntry {
  turn: number;
  eventId: string;
  choiceId: string;
  text: string; // the resolved outcome narration
  quality?: ChoiceQuality; // the chosen path's quality, if the choice was tagged
}

// End-of-turn snapshot of the pools, recorded each week. Feeds the trajectory
// model in the debrief (DESIGN §10: "are the pools trending up across the final
// ~3 turns versus mid-game?").
export interface PoolSnapshot {
  turn: number; // 0 = opening state, then end of each played turn
  pools: Pools;
}

export interface GameState {
  characterId: string;
  mode: Mode;
  config: RunConfig;

  turn: number; // 1-indexed
  endTurn: number; // ~13

  seed: number; // PRNG seed — determinism lives here
  rngState: number; // current PRNG state (advances as outcomes roll)

  pools: Pools;
  slots: number; // per-turn action budget, remaining this turn
  baseSlots: number; // budget before standing commitments (tuning, ~6)
  standingSlots: number; // slots pre-spent each turn by standing commitments
  // that have no interactive event yet (e.g. mandated treatment). beginTurn
  // sets slots = baseSlots - standingSlots. See docs/DESIGN.md §4.

  tracks: Tracks;
  flags: Flags;

  completed: string[]; // event ids permanently resolved (non-repeatable)
  actedThisTurn: string[]; // event ids acted on this turn; an event is
  // actionable at most once per turn. Reset each beginTurn, so a repeatable
  // action (e.g. the weekly parole check-in) returns next week. See §4.
  scheduled: ScheduledEvent[];
  pending: string[]; // incident ids that fired this turn and await resolution
  log: LogEntry[];

  poolHistory: PoolSnapshot[]; // end-of-turn pool snapshots (trajectory scoring)
  violations: number; // accumulated missed obligations (§4, §10)
  terminal: boolean; // a terminal chain ended the run early (only when hardFail)
}

/* ------------------------------------------------------------------ */
/* Character build (origin -> state via chargen)                       */
/* ------------------------------------------------------------------ */

// The human-readable story. Authored as data (see content/characters/*.yaml).
// chargen(origin) derives the opening Pools, Tracks, and Flags. Offense type is
// one layer, never the whole person; the engine models barriers, never judgment.
export interface CharacterOrigin {
  id: string;
  name: string;
  display_age: number;
  summary?: string;

  time_inside_years: number;
  supervision: {
    type: "parole" | "probation" | "none";
    years?: number;
    conditions?: string[]; // e.g. ["weekly_checkin", "curfew", "mandated_treatment"]
  };
  landing: {
    night_one: string; // e.g. "couch", "shelter", "halfway_house", "none"
    housing_clock_turns?: number; // e.g. 30-day welcome ~ 4 turns
    support: string; // e.g. "one_tie", "isolated", "supported"
    job_lined_up: boolean;
    documents: string[]; // flags the character starts holding, if any
    transportation: "car" | "bus_pass" | "bike" | "none";
    gate_money: number; // dollars
  };
  person: {
    in_recovery?: boolean;
    chronic_health_issue?: boolean;
    credentials?: string[]; // e.g. ["cert_webdev"]
  };
  offense: {
    // barrier-mechanical only; drives the heaviest modifiers
    category: string; // e.g. "drug_felony", "registry", ...
    registry_required?: boolean;
  };
}

/* ------------------------------------------------------------------ */
/* Events, choices, outcomes, effects                                  */
/* ------------------------------------------------------------------ */

export type EventKind = "action" | "incident";

// A predicate is a single comparison: "<path> <op> <value>". A list is AND-ed.
// path: flags.X | pools.X | tracks.X.status | tracks.X.readiness | turn | mode | config.X
// op:   == != >= <= > <
// Evaluated by a small safe evaluator — never eval(). Unknown flags read false.
export type Predicate = string;

export interface OutcomeModifier {
  stat: PoolKey;
  // effectiveWeight = max(0, weight + (pools[stat] - 50) * scale)  (tuning)
  scale: number;
}

export interface Effect {
  text: string; // required: the resolved narration
  pools?: Partial<Record<PoolKey, number>>; // deltas, clamped on apply
  flags?: Flags; // booleans to set
  tracks?: Partial<Record<TrackKey, Partial<TrackState>>>; // status/readiness changes
  unlocks?: string[]; // event ids to mark available
  schedule?: { event: string; in_turns: number };
  slots?: number; // optional slot delta (rare)
}

export interface Outcome {
  weight: number;
  modifier?: OutcomeModifier;
  effects: Effect;
}

export interface Choice {
  id: string;
  label: string;
  quality?: ChoiceQuality; // decision-quality tag (DESIGN §10), for the debrief
  requires?: Predicate[]; // if any false, choice renders locked/disabled
  cost?: { slots?: number; money?: number };
  outcomes: Outcome[];
}

export interface GameEvent {
  id: string; // evt_[a-z0-9_]+
  kind: EventKind;
  title: string;
  tags?: string[];
  requires_travel?: boolean; // applies the transport slot multiplier
  repeatable?: boolean;
  conditions?: Predicate[]; // event is eligible only when all pass
  prompt: string;
  choices: Choice[];
}

/* ------------------------------------------------------------------ */
/* Engine surface (suggested signatures — implement per docs/DESIGN.md)*/
/* ------------------------------------------------------------------ */

// A local reentry resource (DESIGN §10). Authored per jurisdiction in
// content/resources.yaml; empty by default. Surfaced in the training debrief.
export interface ResourceItem {
  category: string; // housing | benefits | recovery | legal_aid | employment | ...
  name: string;
  phone?: string;
  url?: string;
  note?: string;
}

export type Corpus = {
  events: Record<string, GameEvent>;
  characters: Record<string, CharacterOrigin>;
  resources?: ResourceItem[];
};

export interface Engine {
  chargen(origin: CharacterOrigin): GameState;
  beginTurn(state: GameState, corpus: Corpus): GameState;
  eligibleActions(state: GameState, corpus: Corpus): GameEvent[];
  isChoiceUnlocked(state: GameState, choice: Choice): boolean;
  resolveChoice(
    state: GameState,
    event: GameEvent,
    choice: Choice,
    corpus: Corpus
  ): GameState;
  endTurn(state: GameState, corpus: Corpus): GameState;
  isRunOver(state: GameState): boolean;
  serializeRun(state: GameState): string;
  loadRun(serialized: string): GameState;
}

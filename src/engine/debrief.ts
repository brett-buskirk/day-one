// End-of-run debrief (DESIGN §10). There is no binary win/lose: the run
// produces an ending-profile snapshot plus a narrative that explains *how* the
// player got there. Scoring is trajectory-aware — momentum and decisions under
// constraint, not just final position — and the numeric score stays internal.
// Framing is mode-aware (training vs empathy). The debrief never says "you lost".

import type { GameState, Pools } from "./types";

export type Tone = "good" | "mixed" | "hard";

export interface Dimension {
  key: string;
  label: string;
  status: string;
  tone: Tone;
}

export interface Milestone {
  key: string;
  label: string;
  achieved: boolean;
}

export type Momentum = "rising" | "holding" | "slipping";

export interface Trajectory {
  early: number;
  late: number;
  delta: number;
  momentum: Momentum;
}

export interface Framing {
  kind: "training" | "empathy";
  intro: string;
  closing: string;
  prompts: string[];
  showResources: boolean;
}

export interface Debrief {
  endedTerminal: boolean;
  headline: string;
  profile: Dimension[];
  milestones: Milestone[];
  milestonesAchieved: number;
  trajectory: Trajectory;
  trajectoryNote: string;
  why: string[];
  framing: Framing;
}

const HOUSING_SECURED = new Set(["rental", "stable", "transitional"]);
const HOUSING_PRECARIOUS = new Set(["couch", "halfway_house"]);
const WORK_LEADS = new Set(["interviewing", "offer", "leads"]);
const CRISIS_EVENTS = new Set([
  "evt_rent_due",
  "evt_money_crisis",
  "evt_health_crisis",
  "evt_parole_violation",
]);

/* ---- Ending profile dimensions ---- */

function housingDimension(s: GameState): Dimension {
  const status = s.tracks.housing.status;
  if (HOUSING_SECURED.has(status)) return { key: "housing", label: "Housing", status: "secured", tone: "good" };
  if (HOUSING_PRECARIOUS.has(status)) return { key: "housing", label: "Housing", status: "precarious", tone: "mixed" };
  return { key: "housing", label: "Housing", status: "at risk", tone: "hard" };
}

function workDimension(s: GameState): Dimension {
  const status = s.tracks.employment.status;
  if (status === "employed" || s.flags.has_job) return { key: "work", label: "Work", status: "landed", tone: "good" };
  if (WORK_LEADS.has(status)) return { key: "work", label: "Work", status: "live leads", tone: "mixed" };
  return { key: "work", label: "Work", status: "still searching", tone: "hard" };
}

function paroleDimension(s: GameState): Dimension {
  const legal = s.tracks.legal;
  if (legal.status === "unsupervised") return { key: "parole", label: "Supervision", status: "none", tone: "good" };
  const r = legal.readiness ?? 0;
  if (r >= 50) return { key: "parole", label: "Supervision", status: "good standing", tone: "good" };
  if (r >= 20) return { key: "parole", label: "Supervision", status: "warned", tone: "mixed" };
  return { key: "parole", label: "Supervision", status: "violation pending", tone: "hard" };
}

function wellbeingDimension(s: GameState): Dimension {
  const h = s.pools.health;
  if (h >= 50) return { key: "wellbeing", label: "Wellbeing", status: "holding", tone: "good" };
  if (h >= 25) return { key: "wellbeing", label: "Wellbeing", status: "strained", tone: "mixed" };
  return { key: "wellbeing", label: "Wellbeing", status: "in crisis", tone: "hard" };
}

function relationshipsDimension(s: GameState): Dimension {
  const status = s.tracks.relationships.status;
  if (status === "network" || status === "supported")
    return { key: "relationships", label: "Relationships", status: "strengthened", tone: "good" };
  if (status === "one_tie") return { key: "relationships", label: "Relationships", status: "holding", tone: "mixed" };
  if (status === "strained") return { key: "relationships", label: "Relationships", status: "strained", tone: "mixed" };
  return { key: "relationships", label: "Relationships", status: "isolated", tone: "hard" };
}

function buildMilestones(s: GameState): Milestone[] {
  const legal = s.tracks.legal;
  const goodStanding = legal.status === "unsupervised" || (legal.readiness ?? 0) >= 50;
  return [
    { key: "state_id", label: "Got a state ID", achieved: !!s.flags.has_state_id },
    { key: "birth_cert", label: "Recovered birth certificate", achieved: !!s.flags.has_birth_cert },
    { key: "proof_of_address", label: "Established proof of address", achieved: !!s.flags.has_proof_of_address },
    {
      key: "work",
      label: "Landed work or live leads",
      achieved: !!s.flags.has_job || WORK_LEADS.has(s.tracks.employment.status),
    },
    { key: "parole", label: "Parole in good standing", achieved: goodStanding },
    { key: "recovery", label: "Stayed in recovery support", achieved: !!s.flags.in_recovery_support },
  ];
}

/* ---- Trajectory (§10): momentum over the run, not just final position ---- */

function vitality(p: Pools): number {
  return (p.money + p.morale + p.social_capital + p.transportation + p.health) / 5;
}

function computeTrajectory(s: GameState): Trajectory {
  const hist = s.poolHistory ?? [];
  if (hist.length < 2) {
    const v = hist.length ? vitality(hist[0].pools) : vitality(s.pools);
    return { early: v, late: v, delta: 0, momentum: "holding" };
  }
  const window = Math.max(1, Math.ceil(hist.length / 3));
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const early = mean(hist.slice(0, window).map((h) => vitality(h.pools)));
  const late = mean(hist.slice(-window).map((h) => vitality(h.pools)));
  const delta = late - early;
  const momentum: Momentum = delta > 4 ? "rising" : delta < -4 ? "slipping" : "holding";
  return { early: Math.round(early), late: Math.round(late), delta: Math.round(delta), momentum };
}

/* ---- "Why it landed here": decisions and setbacks under constraint ---- */

function buildWhy(s: GameState, milestonesAchieved: number, total: number, trajectory: Trajectory): string[] {
  const why: string[] = [];

  why.push(
    milestonesAchieved >= 4
      ? `Cleared ${milestonesAchieved} of ${total} milestones under a hard build — real ground, hard-won.`
      : `Cleared ${milestonesAchieved} of ${total} milestones. The wall is high; every one counts.`
  );

  if (s.violations === 0) {
    why.push("Kept every parole check-in — your standing never slipped to a violation.");
  } else {
    why.push(
      `Missed ${s.violations} check-in${s.violations > 1 ? "s" : ""}; the violations followed you and weighed on your standing.`
    );
  }

  const crises = s.log.filter((l) => CRISIS_EVENTS.has(l.eventId)).length;
  if (crises > 0) {
    why.push(`Weathered ${crises} crisis week${crises > 1 ? "s" : ""} without the run ending — setbacks, not game-overs.`);
  }

  const word = trajectory.momentum === "rising" ? "rising" : trajectory.momentum === "slipping" ? "slipping" : "holding steady";
  why.push(`Your footing was ${word} over the final weeks versus mid-game (${trajectory.early} → ${trajectory.late}).`);

  return why;
}

/* ---- Mode-aware framing (§10) ---- */

function buildFraming(s: GameState): Framing {
  if (s.mode === "empathy") {
    return {
      kind: "empathy",
      intro: "This is the wall — felt from the inside, on an easier build than most people get.",
      closing: "Sit with it a moment before you move on.",
      prompts: [
        "Which barrier ate the most time — and why was it the paperwork, not the work?",
        "Marcus came home with one real tie and a real skill. How does this run go with neither?",
        "How common do you think a week like the hardest one here actually is?",
      ],
      showResources: false,
    };
  }
  return {
    kind: "training",
    intro: "This is practice, not a prediction — and there is always a way forward.",
    closing: "Take the planning, not the verdict. The moves that worked are repeatable; the ones that cost you are seeable in advance next time.",
    prompts: [],
    showResources: true,
  };
}

/* ---- Assemble ---- */

export function buildDebrief(s: GameState, characterName: string): Debrief {
  const profile = [
    housingDimension(s),
    workDimension(s),
    paroleDimension(s),
    wellbeingDimension(s),
    relationshipsDimension(s),
  ];
  const milestones = buildMilestones(s);
  const milestonesAchieved = milestones.filter((m) => m.achieved).length;
  const trajectory = computeTrajectory(s);
  const why = buildWhy(s, milestonesAchieved, milestones.length, trajectory);
  const framing = buildFraming(s);
  const endedTerminal = s.terminal === true;

  const headline = endedTerminal
    ? `The run ended early — a revocation, from violations that stacked up rather than any single slip. ` +
      `That weight is how the system often works. Here is the shape of how ${characterName}'s ninety days went.`
    : `Ninety days home. Here's where ${characterName} stands — and, below, exactly how he got there. ` +
      `This is a snapshot of a trajectory, not a verdict.`;

  const trajectoryNote =
    trajectory.momentum === "rising"
      ? "Momentum: rising. Trending up under a hard build is a win on process, whatever the final position."
      : trajectory.momentum === "holding"
        ? "Momentum: holding. Ground held against real pressure is not nothing."
        : "Momentum: slipping. The pools trended down late — the place to look first next run.";

  return {
    endedTerminal,
    headline,
    profile,
    milestones,
    milestonesAchieved,
    trajectory,
    trajectoryNote,
    why,
    framing,
  };
}

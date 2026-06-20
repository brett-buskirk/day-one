// Sprint 2 — incidents, crises, obligations, scoring (DESIGN §4, §9, §10).

import { describe, it, expect } from "vitest";
import { corpus, MARCUS_ID } from "../content/corpus";
import {
  createRun,
  beginTurn,
  endTurn,
  resolveChoice,
  dueObligations,
  isRunOver,
  loadRun,
  serializeRun,
} from "./engine";
import { buildDebrief } from "./debrief";
import type { Choice, GameEvent, GameState, PoolSnapshot } from "./types";

const choiceOf = (eventId: string, choiceId: string): [GameEvent, Choice] => {
  const e = corpus.events[eventId];
  const c = e.choices.find((x) => x.id === choiceId)!;
  return [e, c];
};

describe("obligations (§4)", () => {
  it("the parole check-in is auto-presented as a due obligation", () => {
    const s = createRun(corpus, MARCUS_ID, { seed: 1 });
    expect(dueObligations(s, corpus).map((e) => e.id)).toContain("evt_parole_checkin");
  });

  it("missing it costs standing, files a violation, and schedules the sub-arc", () => {
    let s = createRun(corpus, MARCUS_ID, { seed: 1 });
    const before = s.tracks.legal.readiness ?? 0;

    // End the week without making the check-in.
    s = endTurn(s, corpus);
    expect(s.violations).toBe(1);
    expect(s.tracks.legal.readiness!).toBeLessThan(before);
    expect(s.scheduled.some((x) => x.event === "evt_parole_violation")).toBe(true);

    // The violation sub-arc fires next week as a forced incident — recoverable.
    s = beginTurn(s, corpus);
    expect(s.pending).toContain("evt_parole_violation");
    const violation = corpus.events["evt_parole_violation"];
    expect(violation.kind).toBe("incident");
    expect(violation.choices.length).toBeGreaterThan(0);
  });

  it("making the check-in avoids any violation", () => {
    let s = createRun(corpus, MARCUS_ID, { seed: 1 });
    const [e, c] = choiceOf("evt_parole_checkin", "make_checkin");
    s = resolveChoice(s, e, c, corpus);
    s = endTurn(s, corpus);
    expect(s.violations).toBe(0);
    expect(s.scheduled.some((x) => x.event === "evt_parole_violation")).toBe(false);
  });
});

describe("pool-floor threshold triggers (§4 step 4, §10)", () => {
  it("money hitting the floor schedules a money crisis next week, once", () => {
    let s = createRun(corpus, MARCUS_ID, { seed: 1 }); // money 15 at turn 0
    s = { ...s, pools: { ...s.pools, money: 0 } };

    s = endTurn(s, corpus); // crossed 15 → 0
    const scheduledCrises = s.scheduled.filter((x) => x.event === "evt_money_crisis");
    expect(scheduledCrises).toHaveLength(1);
    expect(scheduledCrises[0].onTurn).toBe(s.turn); // next week

    // Still broke next week — must NOT pile on a duplicate (edge-triggered).
    s = endTurn(s, corpus);
    expect(s.scheduled.filter((x) => x.event === "evt_money_crisis")).toHaveLength(1);
  });

  it("health hitting the floor schedules a health crisis", () => {
    let s = createRun(corpus, MARCUS_ID, { seed: 1 }); // health 45
    s = { ...s, pools: { ...s.pools, health: 10 } };
    s = endTurn(s, corpus);
    expect(s.scheduled.some((x) => x.event === "evt_health_crisis")).toBe(true);
  });

  it("a crisis is survivable and never ends the run", () => {
    let s = createRun(corpus, MARCUS_ID, { seed: 1 });
    s = { ...s, pools: { ...s.pools, money: 0 } };
    s = beginTurn(endTurn(s, corpus), corpus);
    expect(s.pending).toContain("evt_money_crisis");
    const [crisis, goWithout] = choiceOf("evt_money_crisis", "go_without"); // free fallback
    s = resolveChoice(s, crisis, goWithout, corpus);
    expect(isRunOver(s)).toBe(false);
  });
});

describe("trajectory scoring (§10)", () => {
  const withHistory = (hist: PoolSnapshot[]): GameState => {
    const base = createRun(corpus, MARCUS_ID, { seed: 1 });
    return { ...base, poolHistory: hist };
  };
  const flat = (v: number): PoolSnapshot["pools"] => ({
    money: v,
    morale: v,
    social_capital: v,
    transportation: v,
    health: v,
  });

  it("reads rising momentum when pools trend up late", () => {
    const hist: PoolSnapshot[] = [0, 1, 2, 3, 4, 5].map((t) => ({ turn: t, pools: flat(t < 3 ? 20 : 60) }));
    expect(buildDebrief(withHistory(hist), "Marcus").trajectory.momentum).toBe("rising");
  });

  it("reads slipping momentum when pools trend down late", () => {
    const hist: PoolSnapshot[] = [0, 1, 2, 3, 4, 5].map((t) => ({ turn: t, pools: flat(t < 3 ? 60 : 20) }));
    expect(buildDebrief(withHistory(hist), "Marcus").trajectory.momentum).toBe("slipping");
  });

  it("explains why the run landed where it did", () => {
    const s = createRun(corpus, MARCUS_ID, { seed: 1 });
    const d = buildDebrief(s, "Marcus");
    expect(d.why.length).toBeGreaterThan(0);
    expect(d.headline.toLowerCase()).not.toContain("you lost");
  });
});

describe("mode-aware framing + hardFail (§10)", () => {
  it("training frames as practice and surfaces resources", () => {
    const s = createRun(corpus, MARCUS_ID, { seed: 1, mode: "training", hardFail: false });
    const d = buildDebrief(s, "Marcus");
    expect(d.framing.kind).toBe("training");
    expect(d.framing.showResources).toBe(true);
    expect(d.framing.prompts).toHaveLength(0);
  });

  it("empathy frames for reflection with prompts, no resource list", () => {
    const s = createRun(corpus, MARCUS_ID, { seed: 1, mode: "empathy", hardFail: true });
    const d = buildDebrief(s, "Marcus");
    expect(d.framing.kind).toBe("empathy");
    expect(d.framing.prompts.length).toBeGreaterThan(0);
    expect(d.framing.showResources).toBe(false);
  });

  it("terminal chains only happen under hardFail, from accumulated violations", () => {
    const missCheckins = (mode: "training" | "empathy") => {
      let s = createRun(corpus, MARCUS_ID, { seed: 1, mode, hardFail: mode === "empathy" });
      for (let i = 0; i < 4 && !isRunOver(s); i++) {
        s = endTurn(s, corpus);
        if (!isRunOver(s)) s = beginTurn(s, corpus);
      }
      return s;
    };

    const training = missCheckins("training");
    expect(training.violations).toBeGreaterThanOrEqual(3);
    expect(training.terminal).toBe(false); // training never ends early

    const empathy = missCheckins("empathy");
    expect(empathy.violations).toBeGreaterThanOrEqual(3);
    expect(empathy.terminal).toBe(true);
    expect(isRunOver(empathy)).toBe(true);
  });
});

describe("serialization carries the new state (§13)", () => {
  it("round-trips poolHistory, violations, and terminal", () => {
    let s = createRun(corpus, MARCUS_ID, { seed: 1 });
    s = endTurn(s, corpus); // populates poolHistory + a violation
    expect(loadRun(serializeRun(s))).toEqual(s);
  });

  it("migrates a save written before the Sprint 2 fields existed", () => {
    const base = createRun(corpus, MARCUS_ID, { seed: 1 }) as unknown as Record<string, unknown>;
    delete base.poolHistory;
    delete base.violations;
    delete base.terminal;
    const migrated = loadRun(JSON.stringify({ __dayone: 1, state: base }));
    expect(Array.isArray(migrated.poolHistory)).toBe(true);
    expect(migrated.violations).toBe(0);
    expect(migrated.terminal).toBe(false);
  });
});

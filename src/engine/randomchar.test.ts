// Random character generation — deterministic, coherent, and playable.

import { describe, it, expect } from "vitest";
import { corpus } from "../content/corpus";
import {
  createRunFromOrigin,
  beginTurn,
  endTurn,
  resolveChoice,
  eligibleActions,
  pendingEvents,
  canSelectChoice,
  isRunOver,
  serializeRun,
} from "./engine";
import { randomOrigin, RANDOM_ID } from "./randomchar";
import type { GameState } from "./types";

describe("randomOrigin", () => {
  it("is deterministic — the same seed gives the same person", () => {
    expect(randomOrigin(482913)).toEqual(randomOrigin(482913));
  });

  it("varies across seeds", () => {
    const a = randomOrigin(1);
    const b = randomOrigin(2);
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it("produces a well-formed origin with the random id and a summary", () => {
    const o = randomOrigin(7);
    expect(o.id).toBe(RANDOM_ID);
    expect(o.name.length).toBeGreaterThan(0);
    expect(o.summary && o.summary.length).toBeGreaterThan(0);
    expect(o.time_inside_years).toBeGreaterThanOrEqual(1);
    expect(["parole", "probation", "none"]).toContain(o.supervision.type);
  });
});

describe("a random run is reproducible and playable", () => {
  it("the same seed yields a byte-identical run", () => {
    const opts = { seed: 31337, mode: "empathy" as const, hardFail: true };
    const a = createRunFromOrigin(corpus, randomOrigin(opts.seed), opts);
    const b = createRunFromOrigin(corpus, randomOrigin(opts.seed), opts);
    expect(serializeRun(a)).toBe(serializeRun(b));
  });

  it("plays to completion with pools always in bounds, across many seeds", () => {
    const pick = (s: GameState, e: { choices: { id: string }[] }) => {
      const sel = (e as any).choices.filter((c: any) => canSelectChoice(s, e as any, c));
      return sel[0] ?? null;
    };
    for (let seed = 1; seed <= 25; seed++) {
      let s = createRunFromOrigin(corpus, randomOrigin(seed), { seed });
      let guard = 0;
      while (!isRunOver(s) && guard++ < 30) {
        let g = 0;
        while (s.pending.length && g++ < 12) {
          const inc = pendingEvents(s, corpus)[0];
          const c = pick(s, inc) ?? inc.choices[inc.choices.length - 1];
          s = resolveChoice(s, inc, c, corpus);
        }
        for (const e of eligibleActions(s, corpus)) {
          if (s.slots <= 0) break;
          const c = pick(s, e);
          if (c) s = resolveChoice(s, e, c, corpus);
        }
        s = endTurn(s, corpus);
        if (!isRunOver(s)) s = beginTurn(s, corpus);
      }
      expect(isRunOver(s)).toBe(true);
      for (const v of Object.values(s.pools)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
    }
  });
});

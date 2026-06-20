// Recurring monthly economy: a tick at the start of each month applies standing
// income (benefits) and costs (the transit pass subscription, which lapses if
// you can't cover the fare).

import { describe, it, expect } from "vitest";
import { corpus } from "../content/corpus";
import { createRun, beginTurn, eligibleActions } from "./engine";
import { BENEFITS_STIPEND, TRANSIT_FEE, TRANSIT_LAPSE_DROP } from "./tuning";
import type { GameState } from "./types";

const base = () => createRun(corpus, "marcus", { seed: 1 });
const eligibleIds = (s: GameState) => new Set(eligibleActions(s, corpus).map((e) => e.id));

describe("recurring monthly economy", () => {
  it("pays the benefits stipend at the monthly tick", () => {
    const s = { ...base(), turn: 4, flags: { ...base().flags, has_benefits: true } };
    const after = beginTurn(s, corpus);
    expect(after.pools.money).toBe(s.pools.money + BENEFITS_STIPEND);
    expect(after.log.some((l) => l.choiceId === "benefits")).toBe(true);
  });

  it("does not fire on a non-month-boundary week", () => {
    const s = { ...base(), turn: 3, flags: { ...base().flags, has_benefits: true } };
    const after = beginTurn(s, corpus);
    expect(after.pools.money).toBe(s.pools.money);
  });

  it("charges the transit fee when it can be covered, keeping the pass", () => {
    const s = {
      ...base(),
      turn: 4,
      pools: { ...base().pools, money: 20 },
      flags: { ...base().flags, has_transit_pass: true },
    };
    const after = beginTurn(s, corpus);
    expect(after.flags.has_transit_pass).toBe(true);
    expect(after.pools.money).toBe(20 - TRANSIT_FEE);
  });

  it("lapses the pass when the fare can't be covered, reopening the buy", () => {
    const s = {
      ...base(),
      turn: 8,
      pools: { ...base().pools, money: 3, transportation: 50 },
      flags: { ...base().flags, has_transit_pass: true },
    };
    const after = beginTurn(s, corpus);
    expect(after.flags.has_transit_pass).toBe(false);
    expect(after.pools.transportation).toBe(50 - TRANSIT_LAPSE_DROP);
    expect(eligibleIds(after)).toContain("evt_transit_pass"); // can re-buy when flush
  });

  it("does nothing for a build with neither flag", () => {
    const s = { ...base(), turn: 4 };
    const after = beginTurn(s, corpus);
    expect(after.pools.money).toBe(s.pools.money);
    expect(after.log).toHaveLength(s.log.length);
  });
});

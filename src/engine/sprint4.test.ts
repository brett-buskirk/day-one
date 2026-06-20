// Sprint 4 — broadened corpus, registry-gated housing, economy balance.

import { describe, it, expect } from "vitest";
import { corpus } from "../content/corpus";
import {
  createRun,
  beginTurn,
  endTurn,
  resolveChoice,
  eligibleActions,
  pendingEvents,
  canSelectChoice,
  isRunOver,
} from "./engine";
import type { GameState } from "./types";

const eligibleIds = (s: GameState) => new Set(eligibleActions(s, corpus).map((e) => e.id));
const resolve = (s: GameState, eventId: string, choiceId: string) => {
  const e = corpus.events[eventId];
  return resolveChoice(s, e, e.choices.find((c) => c.id === choiceId)!, corpus);
};

describe("a broadened decision base", () => {
  it("there are many more actions than the seed set, across tracks", () => {
    const actions = Object.values(corpus.events).filter((e) => e.kind === "action");
    expect(actions.length).toBeGreaterThanOrEqual(12);
  });
});

describe("day labor — the ID-free early income path (economy fix)", () => {
  it("is available from the start and pays without an ID", () => {
    let s = createRun(corpus, "marcus", { seed: 1 });
    expect(eligibleIds(s)).toContain("evt_day_labor");
    expect(s.flags.has_state_id).toBeFalsy();
    const before = s.pools.money;
    s = resolve(s, "evt_day_labor", "work_the_day");
    expect(s.pools.money).toBeGreaterThan(before);
  });

  it("makes the ID→job chain reachable through effort within 90 days", () => {
    // A sensible-priority bot: keep parole, push the documents, work day labor
    // for cash when nothing better is affordable.
    const PRI: [string, string][] = [
      ["evt_parole_checkin", "make_checkin"],
      ["evt_dmv_state_id", "apply_prepared"],
      ["evt_dmv_state_id", "order_by_mail"],
      ["evt_proof_of_address", "shelter_letter"],
      ["evt_apply_job_onboarding", "onboard_dev"],
      ["evt_day_labor", "work_the_day"],
    ];
    const play = (seed: number) => {
      let s = createRun(corpus, "marcus", { seed });
      while (!isRunOver(s)) {
        let g = 0;
        while (s.pending.length && g++ < 12) {
          const inc = pendingEvents(s, corpus)[0];
          const c = inc.choices.find((x) => canSelectChoice(s, inc, x)) ?? inc.choices[inc.choices.length - 1];
          s = resolveChoice(s, inc, c, corpus);
        }
        let safety = 0;
        while (s.slots > 0 && safety++ < 10) {
          const elig = eligibleIds(s);
          let picked: [string, string] | null = null;
          for (const [eid, cid] of PRI) {
            if (!elig.has(eid)) continue;
            const e = corpus.events[eid];
            const c = e.choices.find((x) => x.id === cid);
            if (c && canSelectChoice(s, e, c)) {
              picked = [eid, cid];
              break;
            }
          }
          if (!picked) break;
          s = resolve(s, picked[0], picked[1]);
        }
        s = endTurn(s, corpus);
        if (!isRunOver(s)) s = beginTurn(s, corpus);
      }
      return s;
    };
    for (const seed of [1, 7, 42]) {
      expect(play(seed).flags.has_state_id).toBe(true);
    }
  });
});

describe("registry-gated housing (§8): the wall is in the data", () => {
  it("a registry build sees the registry housing event, not the open search", () => {
    const theo = eligibleIds(createRun(corpus, "theo", { seed: 1 }));
    expect(theo).toContain("evt_housing_registry");
    expect(theo).not.toContain("evt_housing_search");
  });

  it("a non-registry build sees the open search, not the registry wall", () => {
    const marcus = eligibleIds(createRun(corpus, "marcus", { seed: 1 }));
    expect(marcus).toContain("evt_housing_search");
    expect(marcus).not.toContain("evt_housing_registry");
  });
});

describe("track content gates on state", () => {
  it("recovery meetings need recovery support; clinic is open to all", () => {
    expect(eligibleIds(createRun(corpus, "marcus", { seed: 1 }))).toContain("evt_recovery_meeting"); // in recovery
    expect(eligibleIds(createRun(corpus, "renae", { seed: 1 }))).not.toContain("evt_recovery_meeting"); // not in recovery
    expect(eligibleIds(createRun(corpus, "renae", { seed: 1 }))).toContain("evt_clinic_enroll");
  });

  it("isolation routes to the support group; a tie routes to tending it", () => {
    const theo = eligibleIds(createRun(corpus, "theo", { seed: 1 })); // isolated
    expect(theo).toContain("evt_community_org");
    expect(theo).not.toContain("evt_mend_tie");
    const marcus = eligibleIds(createRun(corpus, "marcus", { seed: 1 })); // one_tie
    expect(marcus).toContain("evt_mend_tie");
    expect(marcus).not.toContain("evt_community_org");
  });

  it("a transit pass buys down the transport time-tax, once", () => {
    let s = createRun(corpus, "marcus", { seed: 1 }); // transportation 18
    s = resolve(s, "evt_transit_pass", "buy_pass");
    expect(s.flags.has_transit_pass).toBe(true);
    expect(s.pools.transportation).toBeGreaterThan(40);
    expect(eligibleIds(s)).not.toContain("evt_transit_pass"); // retired
  });
});

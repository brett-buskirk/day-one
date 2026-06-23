/**
 * Budget / day-economy simulation harness (reviewer Area 1).
 *
 * This isn't a feature — it's an analysis tool. It plays every build through full runs
 * under several distinct decision *strategies* (the "branches"), instruments where each
 * day goes (standing commitments vs. travel tax vs. real moves vs. idle) and how the pools
 * trend, then prints a report. Run it with:
 *
 *     npx vitest run budget-sim --reporter=basic
 *
 * Read the printed tables to decide whether/which tuning.ts knobs to turn. The assertions
 * only guard invariants (runs terminate, pools stay in bounds) so this also doubles as a
 * balance regression test.
 */
import { describe, it, expect } from "vitest";
import { corpus } from "../content/corpus";
import {
  createRun,
  beginTurn,
  endTurn,
  resolveChoice,
  eligibleActions,
  pendingEvents,
  isObligation,
  isRunOver,
  canSelectChoice,
  effectiveSlotCost,
} from "./engine";
import type { Choice, GameEvent, GameState } from "./types";

const BUILDS = ["marcus", "renae", "dana", "theo", "ray", "cal", "jaylen", "tasha", "gloria"];
const SEEDS = [1, 7, 42];

// ---- choice helpers ---------------------------------------------------------
const selectable = (s: GameState, e: GameEvent): Choice[] =>
  e.choices.filter((c) => canSelectChoice(s, e, c));
const setsFlag = (c: Choice): boolean =>
  c.outcomes.some((o) => o.effects?.flags && Object.values(o.effects.flags).some(Boolean));
const advancesTrack = (c: Choice): boolean =>
  c.outcomes.some(
    (o) =>
      o.effects?.tracks &&
      Object.values(o.effects.tracks).some((t: any) => (t.readiness ?? 0) > 0 || !!t.status)
  );
const earnsMoney = (c: Choice): boolean =>
  c.outcomes.some((o) => (o.effects?.pools?.money ?? 0) > 0);
const isDurable = (c: Choice): boolean => c.quality === "durable";

// Pick the "best forward move" among an event's selectable choices, by a preference list.
function bestChoice(s: GameState, e: GameEvent, prefer: ((c: Choice) => boolean)[]): Choice | null {
  const sel = selectable(s, e);
  if (sel.length === 0) return null;
  for (const p of prefer) {
    const hit = sel.find(p);
    if (hit) return hit;
  }
  return sel[0];
}

// ---- policies (the decision "branches") -------------------------------------
interface Policy {
  name: string;
  incident: (s: GameState, e: GameEvent) => Choice;
  action: (s: GameState) => { event: GameEvent; choice: Choice } | null;
}

// Plays well: clear obligations, then push durable, progress-making moves.
const builder: Policy = {
  name: "builder",
  incident: (s, e) => bestChoice(s, e, [isDurable]) ?? e.choices[0],
  action: (s) => {
    const acts = eligibleActions(s, corpus);
    const oblig = acts.find((e) => isObligation(e) && selectable(s, e).length > 0);
    if (oblig) return { event: oblig, choice: bestChoice(s, oblig, [isDurable])! };
    for (const e of acts) {
      const c = bestChoice(s, e, [
        (x) => isDurable(x) && setsFlag(x),
        (x) => isDurable(x) && advancesTrack(x),
        setsFlag,
        advancesTrack,
      ]);
      if (c && (c.cost?.slots ?? 0) <= s.slots && (setsFlag(c) || advancesTrack(c)))
        return { event: e, choice: c };
    }
    return null;
  },
};

// Reactive: keep obligations, earn only when money runs low, otherwise coast.
const survivor: Policy = {
  name: "survivor",
  incident: (s, e) => bestChoice(s, e, [isDurable]) ?? e.choices[0],
  action: (s) => {
    const acts = eligibleActions(s, corpus);
    const oblig = acts.find((e) => isObligation(e) && selectable(s, e).length > 0);
    if (oblig) return { event: oblig, choice: bestChoice(s, oblig, [isDurable])! };
    if (s.pools.money < 25) {
      const earner = acts.find((e) => !isObligation(e) && selectable(s, e).some(earnsMoney));
      if (earner) return { event: earner, choice: bestChoice(s, earner, [earnsMoney])! };
    }
    return null;
  },
};

// Stress the downside: skip obligations, chase cash, take the desperate branch.
const reckless: Policy = {
  name: "reckless",
  incident: (s, e) =>
    bestChoice(s, e, [(c) => c.quality === "desperate", (c) => (c.cost?.slots ?? 0) === 0]) ??
    e.choices[e.choices.length - 1],
  action: (s) => {
    const acts = eligibleActions(s, corpus).filter((e) => !isObligation(e));
    if (s.pools.money < 35) {
      const earner = acts.find((e) => selectable(s, e).some(earnsMoney));
      if (earner) return { event: earner, choice: bestChoice(s, earner, [earnsMoney])! };
    }
    return null;
  },
};

const POLICIES = [builder, survivor, reckless];

// ---- instrumented driver ----------------------------------------------------
interface Week {
  turn: number;
  base: number;
  standing: number;
  avail: number; // discretionary slots this week (base - standing)
  spent: number;
  travelSpent: number;
  travelTax: number; // extra slots eaten purely by the transport multiplier
  actions: number;
  crises: number;
  unused: number; // discretionary slots left on the table
  money: number;
  morale: number;
  health: number;
}

function playRun(buildId: string, seed: number, policy: Policy) {
  let s = createRun(corpus, buildId, { seed });
  const weeks: Week[] = [];
  // money flows: every positive delta is earned, every negative is drained; peak = the
  // most they ever held (did they ever get a buffer, or live hand-to-mouth all run?).
  let earned = 0;
  let spent = 0;
  let peak = s.pools.money;
  const trackMoney = (before: number) => {
    const d = s.pools.money - before;
    if (d > 0) earned += d;
    else spent += -d;
    if (s.pools.money > peak) peak = s.pools.money;
  };
  let guard = 0;
  while (!isRunOver(s) && guard++ < 25) {
    const wk: Week = {
      turn: s.turn,
      base: s.baseSlots,
      standing: s.standingSlots,
      avail: s.slots,
      spent: 0,
      travelSpent: 0,
      travelTax: 0,
      actions: 0,
      crises: 0,
      unused: 0,
      money: 0,
      morale: 0,
      health: 0,
    };

    // forced incidents
    let g2 = 0;
    while (s.pending.length > 0 && g2++ < 15) {
      const inc = pendingEvents(s, corpus)[0];
      if ((inc.tags ?? []).includes("crisis")) wk.crises++;
      const choice = policy.incident(s, inc) ?? inc.choices[inc.choices.length - 1];
      const base = choice.cost?.slots ?? 0;
      const eff = effectiveSlotCost(s, inc, choice);
      wk.spent += eff;
      if (inc.requires_travel) {
        wk.travelSpent += eff;
        wk.travelTax += eff - base;
      }
      const moneyBefore = s.pools.money;
      s = resolveChoice(s, inc, choice, corpus);
      trackMoney(moneyBefore);
    }

    // discretionary actions
    let g3 = 0;
    while (g3++ < 20) {
      const pick = policy.action(s);
      if (!pick) break;
      const { event, choice } = pick;
      const base = choice.cost?.slots ?? 0;
      const eff = effectiveSlotCost(s, event, choice);
      if (eff > s.slots) break;
      wk.spent += eff;
      wk.actions++;
      if (event.requires_travel) {
        wk.travelSpent += eff;
        wk.travelTax += eff - base;
      }
      const moneyBefore = s.pools.money;
      s = resolveChoice(s, event, choice, corpus);
      trackMoney(moneyBefore);
    }

    wk.unused = s.slots;
    s = endTurn(s, corpus);
    wk.money = s.pools.money;
    wk.morale = s.pools.morale;
    wk.health = s.pools.health;
    weeks.push(wk);
    if (!isRunOver(s)) {
      const moneyBefore = s.pools.money;
      s = beginTurn(s, corpus); // the recurring economy tick (wages in, fees out)
      trackMoney(moneyBefore);
    }
  }
  return { weeks, final: s, earned, spent, peak };
}

// Count the recurring-economy log entries (paycheck, fees) over a run, so we can see what
// drains the hand-to-mouth builds.
function sysCounts(s: GameState): Record<string, number> {
  const c: Record<string, number> = {};
  for (const l of s.log) if (l.eventId === "system") c[l.choiceId] = (c[l.choiceId] ?? 0) + 1;
  return c;
}

// ---- aggregation + formatting ----------------------------------------------
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const r1 = (n: number) => Math.round(n * 10) / 10;
const pad = (s: any, n: number) => String(s).padEnd(n);
const padN = (s: any, n: number) => String(s).padStart(n);

function summarize(buildId: string, policy: Policy) {
  const runs = SEEDS.map((seed) => playRun(buildId, seed, policy));
  const allWeeks = runs.flatMap((r) => r.weeks);
  return {
    availWk: avg(allWeeks.map((w) => w.avail)),
    travelTaxWk: avg(allWeeks.map((w) => w.travelTax)),
    unusedWk: avg(allWeeks.map((w) => w.unused)),
    crises: avg(runs.map((r) => r.weeks.reduce((a, w) => a + w.crises, 0))),
    endMoney: avg(runs.map((r) => r.final.pools.money)),
    endMorale: avg(runs.map((r) => r.final.pools.morale)),
    endHealth: avg(runs.map((r) => r.final.pools.health)),
    weeksPlayed: avg(runs.map((r) => r.weeks.length)),
    earned: avg(runs.map((r) => r.earned)),
    spent: avg(runs.map((r) => r.spent)),
    peak: avg(runs.map((r) => r.peak)),
  };
}

describe("budget / day-economy simulation (reviewer Area 1)", () => {
  it("plays every build under every strategy without dead-ending or breaking bounds", () => {
    // The report is for humans tuning balance; gate it so CI isn't spammed. Run with:
    //   BUDGET_REPORT=1 npx vitest run budget-sim --reporter=basic
    if (process.env.BUDGET_REPORT) {
    const lines: string[] = [];
    lines.push("");
    lines.push("=".repeat(78));
    lines.push("DAY-BUDGET SIMULATION — 9 builds × 3 strategies × 3 seeds (training mode)");
    lines.push("avail = discretionary days/wk (6 base − standing commitments)");
    lines.push("tax   = days/wk lost purely to the travel multiplier (no car)");
    lines.push("idle  = discretionary days/wk left unused (nothing affordable to do)");
    lines.push("=".repeat(78));

    // Table 1 — the BUILDER baseline: what good play yields per build.
    lines.push("");
    lines.push("[1] PLAYING WELL (builder strategy) — where the week goes, where it ends");
    lines.push(
      "  " +
        pad("build", 9) +
        padN("avail", 6) +
        padN("tax", 6) +
        padN("idle", 6) +
        padN("crises", 8) +
        padN("$end", 6) +
        padN("morale", 8) +
        padN("health", 8)
    );
    for (const b of BUILDS) {
      const m = summarize(b, builder);
      lines.push(
        "  " +
          pad(b, 9) +
          padN(r1(m.availWk), 6) +
          padN(r1(m.travelTaxWk), 6) +
          padN(r1(m.unusedWk), 6) +
          padN(r1(m.crises), 8) +
          padN(Math.round(m.endMoney), 6) +
          padN(Math.round(m.endMorale), 8) +
          padN(Math.round(m.endHealth), 8)
      );
    }

    // Table 2 — does good play pay off? end morale across strategies.
    lines.push("");
    lines.push("[2] END MORALE by strategy (is good play rewarded vs. coasting vs. reckless?)");
    lines.push(
      "  " + pad("build", 9) + padN("builder", 9) + padN("survivor", 10) + padN("reckless", 10)
    );
    for (const b of BUILDS) {
      const row = POLICIES.map((p) => Math.round(summarize(b, p).endMorale));
      lines.push("  " + pad(b, 9) + padN(row[0], 9) + padN(row[1], 10) + padN(row[2], 10));
    }

    // [4] economy — earned vs. drained, peak buffer, and what the recurring drains are.
    lines.push("");
    lines.push("[4] ECONOMY (builder) — do they ever get a buffer ($), and what drains them?");
    lines.push(
      "  " +
        pad("build", 9) +
        padN("earned", 8) +
        padN("spent", 7) +
        padN("peak$", 7) +
        padN("end$", 6) +
        "  recurring flows (seed 1)"
    );
    for (const b of BUILDS) {
      const m = summarize(b, builder);
      const fin = playRun(b, 1, builder).final;
      const counts = sysCounts(fin);
      const flows = Object.entries(counts)
        .map(([k, n]) => `${k.replace(/_/g, " ")}×${n}`)
        .join(" ");
      const status = `${fin.tracks.employment.status}/${fin.flags.has_state_id ? "ID" : "no-ID"}`;
      lines.push(
        "  " +
          pad(b, 9) +
          padN(Math.round(m.earned), 7) +
          padN(Math.round(m.spent), 6) +
          padN(Math.round(m.peak), 6) +
          padN(Math.round(m.endMoney), 5) +
          "  " +
          pad(status, 16) +
          (flows || "—")
      );
    }

    // Detail — per-week trace for the hard builds under good play (where days go).
    for (const b of ["marcus", "cal", "theo"]) {
      const { weeks } = playRun(b, 1, builder);
      lines.push("");
      lines.push(`[3] ${b.toUpperCase()} week-by-week (builder, seed 1)`);
      lines.push(
        "  " +
          pad("wk", 4) +
          padN("avail", 6) +
          padN("spent", 6) +
          padN("tax", 5) +
          padN("idle", 5) +
          padN("cris", 5) +
          padN("$", 5) +
          padN("mor", 5) +
          padN("hlth", 5)
      );
      for (const w of weeks) {
        lines.push(
          "  " +
            pad(w.turn, 4) +
            padN(w.avail, 6) +
            padN(w.spent, 6) +
            padN(w.travelTax, 5) +
            padN(w.unused, 5) +
            padN(w.crises, 5) +
            padN(Math.round(w.money), 5) +
            padN(Math.round(w.morale), 5) +
            padN(Math.round(w.health), 5)
        );
      }
    }
    lines.push("=".repeat(78));

    // eslint-disable-next-line no-console
    console.log(lines.join("\n"));
    }

    // ---- invariants (this doubles as a balance regression test) ----
    for (const b of BUILDS) {
      for (const p of POLICIES) {
        for (const seed of SEEDS) {
          const { weeks, final } = playRun(b, seed, p);
          expect(weeks.length).toBeGreaterThan(0);
          expect(weeks.length).toBeLessThanOrEqual(14); // terminates, ~13 weeks
          for (const w of weeks) {
            for (const v of [w.money, w.morale, w.health]) {
              expect(v).toBeGreaterThanOrEqual(0);
              expect(v).toBeLessThanOrEqual(100);
            }
          }
          expect(isRunOver(final)).toBe(true); // no run dead-ends short of the finish
        }
      }
    }
  });
});

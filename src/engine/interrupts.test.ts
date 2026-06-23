import { describe, it, expect } from "vitest";
import { corpus } from "../content/corpus";
import { createRun } from "./index";
import { INTERRUPTS, INTERRUPT_TURN_MIN, INTERRUPT_TURN_MAX } from "./tuning";

// A second random beat per run (independent of the life event): an interrupt that pulls
// you somewhere you didn't plan — a collision, a windfall, an old contact.
describe("random interrupts", () => {
  const interruptOf = (s: ReturnType<typeof createRun>) =>
    s.scheduled.filter((x) => INTERRUPTS.includes(x.event));

  it("schedules exactly one per run, in its window, reproducibly per seed", () => {
    const s = createRun(corpus, "marcus", { seed: 1 });
    const i = interruptOf(s);
    expect(i).toHaveLength(1);
    expect(i[0].onTurn).toBeGreaterThanOrEqual(INTERRUPT_TURN_MIN);
    expect(i[0].onTurn).toBeLessThanOrEqual(INTERRUPT_TURN_MAX);
    expect(createRun(corpus, "marcus", { seed: 1 }).scheduled).toEqual(s.scheduled);
  });

  it("draws variety from the pool across seeds", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 48; seed++) {
      seen.add(interruptOf(createRun(corpus, "marcus", { seed }))[0].event);
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});

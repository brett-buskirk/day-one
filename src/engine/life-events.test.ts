import { describe, it, expect } from "vitest";
import { corpus } from "../content/corpus";
import { createRun } from "./index";
import { LIFE_EVENTS, LIFE_EVENT_TURN_MIN, LIFE_EVENT_TURN_MAX } from "./tuning";

// One unexpected "life happens" beat per run — a loss or a blessing — scheduled at
// a seed-varied mid-game turn off a salted seed (chargen.lifeEventSchedule).
describe("random life events", () => {
  const lifeOf = (s: ReturnType<typeof createRun>) =>
    s.scheduled.filter((x) => LIFE_EVENTS.includes(x.event));

  it("schedules exactly one, in the mid-game window, reproducibly per seed", () => {
    const s = createRun(corpus, "marcus", { seed: 1 });
    const life = lifeOf(s);
    expect(life).toHaveLength(1);
    expect(life[0].onTurn).toBeGreaterThanOrEqual(LIFE_EVENT_TURN_MIN);
    expect(life[0].onTurn).toBeLessThanOrEqual(LIFE_EVENT_TURN_MAX);
    // Same seed → identical schedule (determinism / classroom reproducibility).
    expect(createRun(corpus, "marcus", { seed: 1 }).scheduled).toEqual(s.scheduled);
  });

  it("gives every build exactly one", () => {
    for (const id of ["marcus", "renae", "dana", "theo", "ray", "cal"]) {
      expect(lifeOf(createRun(corpus, id, { seed: 7 }))).toHaveLength(1);
    }
  });

  it("cuts both ways — losses and blessings both occur across seeds", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 48; seed++) {
      seen.add(lifeOf(createRun(corpus, "marcus", { seed }))[0].event);
    }
    const losses = ["evt_life_loss", "evt_life_health"];
    const blessings = ["evt_life_friend", "evt_life_kindness"];
    expect([...seen].some((e) => losses.includes(e))).toBe(true);
    expect([...seen].some((e) => blessings.includes(e))).toBe(true);
  });
});

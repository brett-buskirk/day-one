import { describe, it, expect } from "vitest";
import { corpus } from "../content/corpus";
import { createRun, resolveChoice, endTurn, beginTurn, dueObligations } from "./index";

// The supervision check-in is a skippable obligation: you can "forget" it (end the
// week without it) and take the violation. Its reschedule branch must not turn it
// into a forced incident that blocks the week.
describe("supervision check-ins are skippable obligations", () => {
  it("skipping the parole check-in files a violation (you can 'forget' it)", () => {
    let s = createRun(corpus, "marcus", { seed: 1 }); // Marcus is on parole
    expect(dueObligations(s, corpus).map((e) => e.id)).toContain("evt_parole_checkin");
    const before = s.violations;
    s = endTurn(s, corpus); // end the week without doing it
    expect(s.violations).toBe(before + 1);
  });

  it("rescheduling does not turn the check-in into a forced card next week", () => {
    let s = createRun(corpus, "marcus", { seed: 1 });
    const checkin = corpus.events["evt_parole_checkin"];
    const reschedule = checkin.choices.find((c) => c.id === "reschedule")!;
    s = beginTurn(endTurn(resolveChoice(s, checkin, reschedule, corpus), corpus), corpus);
    expect(s.pending).not.toContain("evt_parole_checkin");
  });
});

import { describe, it, expect } from "vitest";
import { corpus } from "../content/corpus";
import { createRun, isChoiceUnlocked, eligibleActions } from "./index";

// The ID chain's fees (birth cert ~$25 + DMV ~$30) created a poverty trap: a build that
// comes home with nothing can't afford the ID, so can't get a job, so never earns the
// money for the ID — frozen all 90 days. evt_reentry_doc_help is the fee-waived safety net.
describe("the reentry fee-waiver breaks the document poverty trap", () => {
  it("is offered to a build that has no ID", () => {
    const marcus = createRun(corpus, "marcus", { seed: 1 });
    expect(marcus.flags.has_state_id).toBeFalsy();
    expect(eligibleActions(marcus, corpus).some((e) => e.id === "evt_reentry_doc_help")).toBe(true);
  });

  it("lets a broke build get the ID with no money — where the paid DMV route is locked", () => {
    const base = createRun(corpus, "marcus", { seed: 1 });
    // Prerequisites in hand (cert + proof), but flat broke:
    const ready = {
      ...base,
      flags: { ...base.flags, has_birth_cert: true, has_proof_of_address: true },
      pools: { ...base.pools, money: 0 },
    };
    const waived = corpus.events["evt_reentry_doc_help"].choices.find((c) => c.id === "waived_id")!;
    expect(isChoiceUnlocked(ready, waived)).toBe(true); // no money gate — the way through

    const paid = corpus.events["evt_dmv_state_id"].choices.find((c) => c.id === "apply_prepared")!;
    expect(isChoiceUnlocked(ready, paid)).toBe(false); // the paid route needs $30 you don't have
  });
});

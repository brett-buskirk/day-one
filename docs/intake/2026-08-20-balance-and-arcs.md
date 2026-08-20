---
recording_id: 89bf70abd0304bb53a90af4ee9836aa1
recorded: 2026-08-20
duration: 1m00s
mode: brainstorm
repo: brett-buskirk/day-one
issues: []
---

# 2026-08-20 — Game balance, a gym event, and character-arc completeness

Single-voice recording (Plaud auto-titled it "Meeting," but there's one speaker
throughout) — three distinct, unrelated content/balance thoughts.

## A gym / exercise event

**Type:** Content: Event
**TL;DR:** A new action event — going to the gym or exercising — that raises health
(and possibly morale) without unbalancing the economy.

### What I'm seeing / want

"Let's add an event for exercise or going to the gym that helps improve the player's
health and possibly morale without tipping the balance of gameplay." No existing
event covers this — `content/events/` has nothing matching gym/exercise/workout.

### Specifics

- No `evt_gym`/`evt_exercise` (or similar) event exists today.
- Grounding for "without tipping the balance": across the current corpus, outcomes
  that raise `health` cluster in the **+6 to +12** range, and almost always pair the
  gain with a cost — money (roughly −3 to −10) or the implicit cost of spending a
  weekly slot. The one clean double-positive I found is `{ health: 10, morale: 8,
  social_capital: 2 }` with no downside listed, which looks like an outlier rather
  than the norm worth copying.

### Desired outcome

A new event in `content/events/`, `npm run build:content` passes (schema-valid, no
unregistered flags), and its health/morale deltas land inside the existing corpus's
range for a *costed* self-care action rather than being a bigger free win than
anything else in the game.

### Constraints / north stars

- Authored as content, not code (`CONTRIBUTING.md`) — no engine changes needed for
  this.
- Pool deltas clamp to [0, 100]; new flags (if any) get registered in
  `src/engine/flags.json` before use.

### Path & open questions

**Quick action** — routine content authoring. Open questions before it's scoped as
an issue:
- Should it cost a weekly slot like most actions, or be a smaller time cost meant to
  be taken often?
- Repeatable every turn, or capped (e.g., a cooldown) so it can't become a free
  health-stacking loop?
- Does it need a money cost (gym fee) as the trade-off, or is the slot cost the only
  trade-off?

---

## Balance sweep across the five pools

**Type:** Balance
**TL;DR:** Audit existing events for skew across money, morale, support (`social_capital`),
transportation, and health; flag anything lopsided and propose corrective events.

### What I'm seeing / want

"Let's do a sweep through the existing events to check for game balance when it
comes to the five metrics... if anything looks slanted too far one way or the
other, flag it and let's figure out some new events to balance the simulator."

### Specifics

- A rough signal (event files whose outcomes touch each pool, out of 70 total event
  files): **morale 69, social_capital 25, money 24, health 19, transportation 5.**
  Transportation stands out as the least-touched pool by a wide margin — though that
  may be by design, since transportation is also driven by the transport-multiplier
  and ladder system (`docs/DESIGN.md` §4), not primarily by one-off event deltas.
  That's worth confirming before treating it as a gap.
- This project has a **budget-sim harness** built for exactly this kind of
  before/after balance measurement (referenced in `docs/intake/PROFILE.md` and prior
  balance work — PRs #69, #71, #73).

### Desired outcome

A harness-backed report of which pool(s), if any, are measurably skewed — not an
eyeballed guess — followed by either new events or adjusted deltas on existing
events to correct it.

### Constraints / north stars

- Tuning numbers live in `src/engine/tuning.ts`; corrective changes to *content*
  (event deltas, new events) stay in `content/`, not hardcoded in the engine.
- Measure before tuning — this project's own convention, not just good practice.

### Path & open questions

**Measure first** — run the budget-sim harness before this becomes a scoped
change. Open question: is the transportation gap real, or accounted for by the
ladder/multiplier system? That has to be answered before proposing new
transportation-touching events.

---

## Character-arc completeness (Tasha, and by extension the other archetypes)

**Type:** Content (spans `content: archetype` and `content: event`)
**TL;DR:** Confirm each character archetype's named arc has all the events it needs
to feel complete, using Tasha's custody arc as the example.

### What I'm seeing / want

"Let's look at the various characters and their arcs, such as Tasha who has certain
court requirements regarding her daughter. Let's make sure all the events
surrounding their arcs are present and suggest any that might need to be added or
adjusted to complete the arc for the character."

### Specifics

- **Tasha's arc today:** three events gated on `flags.reunifying` —
  `evt_custody_hearing` (the payoff, scheduled week 9), `evt_custody_visit`
  (repeatable, retires on `custody_regained`), and `evt_arrears_notice`
  (child-support pressure). The hearing gates on `tracks.housing.readiness >= 3`,
  `tracks.legal.readiness >= 50`, `pools.money >= 40`.
- This arc was already reviewed twice recently: **PR #67** made it legible in the
  situation panel (a "Custody hearing — week 9" section showing live standing on the
  three gates) and surfaced her recovery status; **PR #68** verified the housing
  gate is reachable — a harness test simulates a housing-first Tasha across 5 seeds
  and confirms she clears transitional housing well before week 9 every time.
- One possible gap I noticed while reading the arc: the hearing's "ask for more
  time" outcome (`{ morale: -12, social_capital: 2 }`) doesn't schedule a follow-up
  hearing or appeal — the arc continues only through the still-available
  `evt_custody_visit`, with no scheduled second attempt. That may be intentional
  (matches "no you lost screen" — an ongoing state, not a retry timer) rather than a
  gap; flagging it rather than assuming either way.
- The note names Tasha as an example ("such as"), implying the same check should
  extend to other archetypes with a named arc — e.g. Ray's tech-gap/mental-health
  thread, Theo's registry wall, Dana's home-detention status, Hector's VA/PTSD arc
  (all named in `ROADMAP.md`/`CLAUDE.md`). I did not audit those in this pass — only
  Tasha's, since she's the one named in the recording.

### Desired outcome

For each archetype with a named arc: confirm every flag/condition it sets is
actually consumed by at least one event, and that the arc has a legible, scheduled
payoff the way Tasha's hearing is one. Propose additions only where a real gap is
found — not a default assumption that more content is needed.

### Constraints / north stars

- "The arc emerges; it isn't scripted" (`docs/DESIGN.md` §2) — any new events chain
  through `conditions`, `unlocks`, and `schedule`, not a hardcoded sequence.
- Difficulty and barriers are authored in content data, not code (`CONTRIBUTING.md`).
- No "you lost" screen — a new terminal-feeling beat needs a branch, not a dead end.

### Path & open questions

**Quick action** to run the audit itself (a bounded content review across
`content/characters/` and `content/events/`). Any gaps it surfaces become their own
`content: event` work afterward — that's a separate step, not part of this pass.
Open question: is the "ask for more time" outcome intentionally a soft dead-end, or
should it schedule a follow-up hearing?

---

## Parking lot

_None — all three points in the note map to a concrete item above; nothing was too
vague to place there._

## Candidate issues

_Two of three items are ready; the balance sweep stays out until the harness
measurement runs — see its Path & open questions above._

### Add a gym/exercise self-care event
- **Type / labels:** `content: event` · `needs-triage`
- **Why:** requested directly — a way to recover health (and maybe morale) that
  doesn't unbalance the game, per the recording.
- **Done looks like:** a new event validates via `npm run build:content`, and its
  pool deltas fall within the corpus's existing range for a costed health-positive
  action (see Specifics above) rather than exceeding it.

### Audit character-archetype arcs for event completeness
- **Type / labels:** `content: archetype` · `content: event` · `needs-triage`
- **Why:** Tasha's arc was named directly as the example; the same completeness
  check applies to every archetype with a named arc.
- **Done looks like:** a written finding per archetype (arc complete / gap found),
  citing the flags and events involved, with the "ask for more time" question above
  resolved one way or the other for Tasha specifically.

## ⚠ Sensitive — review before commit

- None. The recording is entirely in-scope game-design content about a fictional
  character's arc — no rates, real personal detail, or third-party material to flag.

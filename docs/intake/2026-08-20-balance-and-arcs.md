---
recording_id: 89bf70abd0304bb53a90af4ee9836aa1
recorded: 2026-08-20
duration: 1m00s
mode: brainstorm
repo: brett-buskirk/day-one
issues: [85, 86]
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
change. **Resolved:** the low transportation-touch count is expected — it's
carried by the ladder/multiplier system rather than one-off event deltas — but
run the harness sweep anyway to confirm nothing's actually missing rather than
taking the hypothesis on faith.

---

## Character-arc completeness — all ten archetypes

**Type:** Content (spans `content: archetype` and `content: event`)
**TL;DR:** Audited all ten archetypes' arcs for event completeness, using Tasha's
custody arc as the starting example. One real gap found and resolved.

### What I'm seeing / want

"Let's look at the various characters and their arcs, such as Tasha who has certain
court requirements regarding her daughter. Let's make sure all the events
surrounding their arcs are present and suggest any that might need to be added or
adjusted to complete the arc for the character."

### Audit findings (all ten archetypes)

Cross-referenced each archetype's chargen-derived flags against
`src/engine/flags.json` and which events in `content/events/` actually consume
them.

- **Tasha** (`reunifying`) — three events: `evt_custody_hearing` (payoff, week 9),
  `evt_custody_visit` (repeatable), `evt_arrears_notice`. **One gap, now decided
  (see below):** the hearing's "ask for more time" outcome doesn't schedule a
  follow-up.
- **Theo & Ray** (`registry_required`) — the best-covered arc in the game: **7**
  events reference it (`evt_get_hired`, `evt_own_place`, `evt_housing_registry`,
  `evt_job_registry`, `evt_housing_search`, `evt_apply_job_onboarding`,
  `evt_recovery_housing`). No gap found.
- **Ray** (`tech_gap`) — derived from `time_inside_years >= TECH_GAP_YEARS` (15,
  per `tuning.ts`); Ray (24 years) is the *only* archetype that crosses it. **4**
  events reference it (`evt_license_restore`, `evt_apply_job_onboarding`,
  `evt_job_registry`, `evt_digital_literacy`). No gap found.
- **Ray & Hector** (`chronic_mental_health`) — 1 dedicated event,
  `evt_counseling`, but it's a *repeatable* weekly action (same shape as Tasha's
  visit event), not a one-shot climax — that's the intended pattern for an ongoing
  support mechanic, not thin coverage. No gap found.
- **Hector** (`veteran`) — **2** events (`evt_va_claim`, `evt_vso_support`),
  matching `ROADMAP.md`'s description exactly ("a VSO, and the grind of a
  VA-claim backlog"). No gap found.
- **Dana** (`home_detention` / `owes_home_detention_fees`) — no dedicated
  narrative event beyond `evt_off_supervision` (shared by every supervised
  build). Her experience is carried by the recurring weekly home-detention fee in
  the engine's tick (`CLAUDE.md`: "the weekly home-detention fee"), not a
  discrete event chain — that's by design, the same pattern as ordinary
  supervision fees. No gap found.
- **Cal** (`supervision.type: none`) — no event references "no supervision"
  directly; confirmed the difference is structural (no standing slot tax, no
  check-in violations possible), not authored content. Consistent with the
  build's premise — the *absence* of structure is the point, not a missing event.
  No gap found.
- **Marcus, Renae, Jaylen, Gloria** — none carry a chargen-derived flag unique to
  them; they're differentiated by starting-state severity (support tier,
  documents on hand, transportation, money) that the generic event pool's
  `conditions` already handle. No dedicated arc content is "missing" because none
  was ever authored to be archetype-specific for these four — by design, not a
  gap.

**Net finding: one real gap, in Tasha's arc — the rest check out**, either
well-covered or intentionally structural rather than event-driven.

**Decided:** the "ask for more time" outcome should schedule a follow-up hearing
(court review) rather than leaving the arc open only through `evt_custody_visit`
— adds realism, per direction. Filed as its own candidate issue below rather than
folded into this finding, since it's a distinct, scoped content change.

### Constraints / north stars

- "The arc emerges; it isn't scripted" (`docs/DESIGN.md` §2) — any new events chain
  through `conditions`, `unlocks`, and `schedule`, not a hardcoded sequence.
- Difficulty and barriers are authored in content data, not code (`CONTRIBUTING.md`).
- No "you lost" screen — a new terminal-feeling beat needs a branch, not a dead end.

### Path & open questions

**Done** — audit complete, all ten archetypes covered. One follow-on content
change identified; see candidate issues.

---

## Parking lot

_None — all three points in the note map to a concrete item above; nothing was too
vague to place there._

## Candidate issues

_The arc audit is done (findings above, no issue needed for the audit itself); the
balance sweep stays out until the harness measurement runs — see its Path & open
questions above. Two issues ready to file._

### Add a gym/exercise self-care event
- **Type / labels:** `content: event` · `needs-triage`
- **Why:** requested directly — a way to recover health (and maybe morale) that
  doesn't unbalance the game, per the recording.
- **Done looks like:** a new event validates via `npm run build:content`, and its
  pool deltas fall within the corpus's existing range for a costed health-positive
  action (see Specifics above) rather than exceeding it.

### Schedule a follow-up custody hearing after "ask for more time"
- **Type / labels:** `content: event` · `needs-triage`
- **Why:** the arc audit found `evt_custody_hearing`'s "ask for more time" outcome
  is a dead end — no scheduled second attempt, only the still-available
  `evt_custody_visit`. Decided this should schedule a follow-up court review
  instead, for realism.
- **Done looks like:** the "ask for more time" outcome's effects gain a `schedule`
  for a follow-up `evt_custody_hearing`-style event (a second attempt at the same
  gates, or an eased version), chaining per `docs/DESIGN.md` §2's "the arc emerges;
  it isn't scripted" — not a hardcoded retry loop.

## ⚠ Sensitive — review before commit

- None. The recording is entirely in-scope game-design content about a fictional
  character's arc — no rates, real personal detail, or third-party material to flag.

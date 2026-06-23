# Day One — design specification

This is the source of truth for the build. It captures the decisions made during
design so the engine can be implemented without re-deriving them. Where it says
"tuning," the exact number is a knob to balance later, not a thing to block on.

> **Implementation status:** built and live in production (through **v1.4.0**), and the spec still
> holds. Where it scoped features as "v2" (§8, §14) — random character generation
> and the classroom/facilitator hooks — those have since shipped; a real resource
> directory remains a data hook only. See [`DEVELOPMENT.md`](../DEVELOPMENT.md) for
> what's built, sprint by sprint.

---

## 1. Vision and audiences

Day One simulates the first ~90 days after release from prison. The player is
handed a character — an *origin* — and lives a sequence of weekly turns, spending
a limited budget of time against more obligations than it covers, while resources
erode and recover and the situation branches.

Two audiences, weighted equally:

- **Training (RCs):** set realistic expectations, rehearse decisions safely,
  build planning confidence. The emotional contract is "this is practice, not a
  prediction, and there is always a way forward."
- **Empathy (outsiders):** convey, viscerally, what reentry demands. The
  emotional contract is "feel the wall." Outsiders can be handed harder builds and
  can opt into terminal failure.

Both run on one engine and one content corpus. See §10 for how the modes differ.

---

## 2. Design principles

1. **Setbacks, not game-overs.** Consequence comes from *attrition and compounding
   tradeoffs*, not a fail screen. Recovery costs time, money, and morale you can't
   spare; setbacks stack; the system forces choices between two things you both
   need. Failure is erosion, not death.
2. **Trajectory over position.** Score on momentum and decision quality, not only
   on where day 90 leaves you. A registry build may end precarious through no bad
   play; grading on absolute outcome would tell an RC they "lost" at their own
   life. Reward stacking good decisions under constraint.
3. **Barriers are preconditions.** Every obstacle is enforced in data — a
   `requires` on a choice, a `condition` on an event. The player can *see* the
   right move and be unable to take it yet. That gap is the simulation.
4. **The arc emerges; it isn't scripted.** Author *situations*, not a storyline.
   Events chain through conditions, unlocks, and scheduled follow-ups. The
   player's path writes the narrative.
5. **One engine, two framings.** Mode changes onboarding, difficulty defaults,
   debrief framing, and a `hardFail` flag — nothing in the core loop.
6. **Deterministic and serializable.** Seedable RNG and run serialization are
   non-negotiable engine requirements (see §13). They keep classroom/facilitator
   modes free and make the engine testable.

---

## 3. Architecture

Four parts, one direction of dependency (content and engine know nothing about
the UI):

- **Content corpus** — events and character origins, authored as data (YAML →
  validated JSON). The *world*.
- **Simulation engine** — pure functions: resolve a turn, evaluate conditions,
  roll weighted outcomes, apply effects. Holds no UI and no I/O. The *rules*.
- **Resource pools + game state** — the serializable state the engine reads and
  writes (see §5, §13). The shared currency that makes tracks interact.
- **Framing layer + debrief** — thin shell that picks a mode, runs onboarding,
  hands state to the engine, and renders the end-of-run debrief. The only
  audience-aware part. React lives here.

Implementation note: keep `engine/` free of React imports. The UI subscribes to
state and dispatches player choices; everything else is the engine.

---

## 4. The turn loop

A **turn is one week.** Within a week the player has an **action budget** of
discrete slots (the usable days), and spends them on actions until they run out or
choose to end the week. This is the core tension: "this week I can hit the DMV, or
the benefits office, or the interview — not all three."

- **Base budget:** 7 slots/week (tuning) — one per day. Standing commitments and the
  travel tax visibly subtract from it (see below), so the squeeze reads as attribution,
  not an unexplained short week.
- **Standing commitments** pre-spend slots before the player chooses — e.g. a
  weekly parole check-in and mandated treatment. These are obligations (see below)
  and reduce the discretionary budget.
- **Run length:** ~13 weekly turns (~90 days). The first 90 days are widely
  treated as the make-or-break window and make a natural finish line; the run also
  fits one sitting, which matters when running it with a room.

### Resolver algorithm (per turn)

1. **Begin turn.** Replenish slots to base. Fire any incidents scheduled for this
   turn (see §9). Surface obligations as forced/auto-presented items.
2. **Player acts.** Present eligible actions (events with `kind: action` whose
   `conditions` all pass and which aren't completed unless `repeatable`). For each
   action the player selects, deduct its slot cost (see multiplier below) and
   resolve it.
3. **Resolve an action.** Take the chosen choice. Roll its `outcomes` as a
   weighted random selection, adjusted by any `modifier` (see §9). Apply the
   selected outcome's `effects`: clamp pool deltas to [0, 100], set flags, move
   tracks, append narration to the run log, and register any scheduled follow-ups.
4. **End turn.** Check threshold triggers (e.g. a pool hitting a floor schedules a
   crisis), advance recurring obligations, increment the turn counter.
5. **Repeat** until `turn === END_TURN`, then compute the ending profile and
   trajectory and render the debrief (see §10).

### Transportation multiplier

Transportation is a first-class pool because, without a car, every errand taxes
the rest of the week. For any event with `requires_travel: true`, the effective
slot cost is `baseSlots × transportFactor(pools.transportation)`:

| transportation pool | meaning                            | factor |
| ------------------- | ---------------------------------- | ------ |
| ≥ 30                | reliable transit — a car or a pass | ×1     |
| < 30                | on foot / an unreliable bike       | ×2     |

(Thresholds are tuning.) Round the result up. **Two tiers, not three, on purpose:**
because the cost rounds up and almost every errand is a 1-day base, a fractional middle
tier (×1.5) was *identical* to ×2 for the common case — so a hard-won bus pass changed
nothing. Collapsing it means reliable transit (a car **or** a pass) actually removes the
tax, giving the squeezed builds a *reachable* escape; on foot, every errand still eats the
day twice. This is why low transportation *is* the grind — fewer real moves per week —
modeled honestly rather than narrated.

The tax is also **attributed** in the UI (reviewer Area 1: the day budget shouldn't read
as *arbitrarily* tight): the turn header states it when it applies ("On foot, every errand
across town costs double — a bus pass or car would ease the squeeze"), and each travel card
shows the multiplier (`travel ×2`). The squeeze becomes a consequence the player can see
and act on, not a number that just happens to them.

### Obligations

Events tagged `obligation` (e.g. the parole check-in) are auto-presented each turn
they're due. Completing one keeps standing; failing to complete it within the turn
applies a consequence (e.g. schedules a violation sub-arc). Obligations are how
supervision conditions become a standing claim on the budget.

---

## 5. Resource pools

Five pools, each an integer in **[0, 100]**, all clamped on every write. They are
the shared currency every track spends against — that coupling is the simulation.

- **money** — cash on hand. Gate money seeds it. Fees, fares, and rent drain it;
  income refills it. Hitting the floor triggers a money crisis, never death (§10).
  *Poverty-trap guard:* the ID chain's fees (birth cert + DMV) once locked out the builds
  who came home with nothing — no ID → no job → no income → never affording the ID. A
  fee-waived **reentry document program** (`evt_reentry_doc_help`) is the safety net: same
  sequence, no money gate, but slower and with an eligibility step, so it's the broke
  build's route, not a shortcut past paying. (Surfaced by the `budget-sim` harness.)
- **morale** — hope and momentum. Fragile early. Setbacks drain it; milestones and
  small wins refill it. Low morale can gate or worsen some outcomes (tuning).
- **social_capital** — the strength and willingness of one's support network. Low
  by default for the isolated. Spent when leaning on people; can sour a tie if
  overdrawn. Tilts the odds on outcomes that depend on goodwill.
- **transportation** — ability to get around (see §4 for its slot multiplier). The
  acquisition events form a **getting-around ladder** via flags (`has_bike` <
  `has_transit_pass` < `has_car`): each option only surfaces when it's a step up and
  retires once you have it or anything better, so you're never re-offered wheels you've
  got. A driver's **license is permission, not a vehicle** — `has_license` (a modest
  mobility bump) gates `evt_get_car`, where you actually buy or regularly borrow one
  (`has_car`, the top rung); only `has_car` reads as "a car."
- **health** — physical and recovery wellbeing combined. Many people come home
  with chronic issues and/or in recovery. Physical labor and stress drain it;
  rest, treatment, and recovery support refill it. Low health raises relapse/crisis
  risk (tuning).

The **action budget (slots)** is a per-turn currency, not a [0,100] pool; it
resets each week (see §4). Treat it separately in state.

**Technology** is modeled as *flags + a recurring cost*, not a pool — a phone is something
you have or don't, not a gradient. `has_phone` (some builds start with one, some without —
the first barrier) and `owes_phone_plan` (a paid plan) drive a monthly **plan fee** that,
unpaid, shuts the phone off; the **Lifeline / ACP** subsidized phone (`evt_get_phone`)
carries no fee. **Phase 1** makes it a cost and a disconnection. **Phase 2** makes it *pay
off* — a phone-only **"Work the phone"** action (`evt_work_the_phone`) lets you chase job
leads and keep your network close *remotely*, a **soft advantage rather than a gate**: the
phone-less aren't blocked, they just lean on the slower, travel-heavy in-person paths.
**Phase 3** is the **laptop** (`has_laptop`), rarer than a phone — and here a hard gate is
*faithful*: the remote dev role genuinely needs a computer, so a certified-but-computerless
build (Marcus) sees the dev job as a **visible locked button** (§2.3, the catch-22) with a
path out (`evt_get_laptop`: buy refurbished, or a workforce refurb-laptop program). It gates
only that one skilled route — other jobs need no laptop — so employment at large stays open.

---

## 6. Tracks

Four parallel domains, each a small state machine sharing the pools. A track has a
`status` (enum) and an optional numeric `readiness` (0–100, tuning) for finer
movement. Suggested statuses (extend as needed):

- **employment** — `unemployed` → `searching` → `leads` → `interviewing` →
  `offer` → `employed`. Marcus starts `unemployed` but holds a real skill behind a
  paper-trail wall (see §8).
- **housing** — `none` / `shelter` / `couch` (with a clock) / `transitional` /
  `rental` / `stable`. Marcus starts `couch` on a 30-day clock. These form a **ladder**
  (`HOUSING_RANK` in tuning): the engine keeps `housing.readiness` in sync with the
  status as a rank, so a housing rung gates on `tracks.housing.readiness < N` — a move
  only ever goes *up*, and an outgrown rung stops being offered.
- **legal** — `parole` / `probation` / `unsupervised`, with sub-state for standing:
  `good` / `warned` / `violation_pending`. Conditions live here as flags/obligations.
- **relationships** — `isolated` / `strained` / `one_tie` / `supported` /
  `network`. Housing and crises often depend on this.

Tracks move via event `effects.tracks`. Keep movement legible — a player should be
able to point at why a track shifted.

---

## 7. Flags

Flags are a flat map of named booleans on game state: `flags: Record<string,
boolean>`. They are how discrete facts (you have an ID, you know the requirements,
you ordered the cert) gate and unlock content. Convention: lowercase snake_case,
read as a true statement (`has_state_id`, `birth_cert_ordered`).

Seed flags referenced by the starter content (the engine treats any unset flag as
`false`):

- `has_state_id`, `has_birth_cert`, `has_proof_of_address`, `has_ssn_card`
- `birth_cert_ordered`, `knows_id_requirements`
- `has_bank_account`, `has_cert_webdev`, `has_job`
- `in_recovery_support`

Keep a flag registry in the codebase (a `const` union or a documented list) so
authors don't typo a flag into silent falsehood. Validation can warn on unknown
flags referenced in content.

---

## 8. Character builds

A build has two layers:

- **Origin** — the human-readable story. Authored as data. Four dimensions plus
  offense type:
  - *Time inside* — drives the tech gap, frayed ties, disorientation.
  - *Supervision* — parole/probation/none and its conditions; pure friction on the
    budget via obligations.
  - *The landing* — where you sleep night one, who's in your corner, whether a job
    is lined up, which documents you hold, what you get around on, and gate money.
  - *The person* — age, health/recovery, and skills/credentials earned inside
    (which is exactly what TLM-style programs add — make it matter).
  - *Offense type* — the heaviest single modifier. It is one origin layer, never
    the whole person, and the sim models barriers and consequences, **never**
    moral judgment. A registry requirement reshapes housing and employment more
    than anything else; a registry build flips housing from hard to near-impossible
    and is the deliberate deep-end build for empathy mode. Keep offense framing
    barrier-mechanical only.

- **Starting state** — what the engine derives from the origin: opening pool
  levels, each track's starting status, and the initial flags. A `chargen(origin)`
  function maps origin → state, so new characters are authored as data, not code.

For v1, ship a handful of **hand-authored archetypes** (curated, coherent, each a
teaching scenario). *(Shipped: five — Marcus, Renae, Dana, Theo, and Ray; see below.
Random generation — once scoped as v2 — also shipped, behind a "Surprise me" option:
`randomOrigin(seed)`.)*

### Seed archetype: Marcus (see content/characters/marcus.yaml)

38, six years in, real web-dev skills earned inside but a six-year gap and a
background flag, no state ID and no documents, on the sibling's couch with a
30-day clock, a suspended license (unpaid fines) so he's on a bike and the bus, in
recovery with a chronic back injury, $120 gate money, a drug-related felony. The
thesis build: the skill is real; the wall is everything around *using* it. The
chargen mapping for Marcus is documented in his file.

The shipped roster adds eight more, each authored purely as origin data: **Renae**
(a supported build — family, money, transport — the same content at a gentler
difficulty), **Dana** (probation under the weight of its costs: supervision fees *and*
**home detention** — a relentless weekly monitoring fee plus a restricted week — and a
surprise officer home visit, like any supervised build),
**Theo** (the registry deep-end build for empathy mode), **Ray** (the longtimer —
24 years inside, a technology gap, and chronic mental-health weight), **Cal**
(a "max-out" release with `supervision: none` → legal status `unsupervised`: no
check-ins, fees, or slot tax, but isolated and unsupported — freedom without
scaffolding), **Jaylen** (a young first-timer whose wall is inexperience — no work
history, low employment readiness — rather than a record), **Gloria** (the "has it
all" contrast build: a job, savings, a car, all documents, network support, on the
gentlest setting — proof of how much the starting deck matters), and **Tasha** (a
reunifying parent).

Tasha carries the one build-specific arc: `person.reunifying: true` derives a
`reunifying` flag and schedules a **custody hearing** (week 9). A recurring
`evt_custody_visit` keeps the bond warm; the hearing's "make your case" choice is a
catch-22 gated on built stability (`housing.readiness ≥ 3`, `legal.readiness ≥ 50`,
`money ≥ 40`) — so the whole run *is* the case, and falling short is supervised
visits and another date, never a fail screen.

---

## 9. Event model

Events are the content unit. They are authored in YAML, validated against
`schema/event.schema.json`, and compiled to JSON. The canonical TypeScript shapes
are in `src/engine/types.ts`; this section is the rationale.

### Fields

- `id` — unique, `evt_[a-z0-9_]+`.
- `kind` — `action` (player spends a slot to choose it) or `incident` (fires when
  scheduled or when a trigger condition is met; interrupts the week).
- `title` — author/UI label.
- `tags` — optional, e.g. `[documents, legal, obligation]`.
- `requires_travel` — optional; if true the engine applies the transport
  multiplier to slot costs (§4).
- `repeatable` — optional; if false the event is removed once completed.
- `conditions` — optional list of predicates; the event is eligible only when all
  pass.
- `prompt` — the narrative shown to the player.
- `choices` — what the player can do.

### Choices

- `id`, `label` (button text).
- `requires` — optional predicate list; if any is false the choice is shown but
  **locked/disabled**. This is the catch-22 made mechanical — the player sees the
  right move and can't take it yet.
- `cost` — optional `{ slots?, money? }`.
- `outcomes` — a weighted list (below).

### Weighted outcomes

A choice resolves to one outcome chosen by `weight`. An optional `modifier` lets a
stat tilt the odds:

```
modifier: { stat: <PoolKey>, scale: <number> }
effectiveWeight = max(0, weight + (pools[stat] - 50) * scale)
```

So `scale: +0.3` makes higher values of that stat more likely; `-0.3`, less. This
is how stats matter without the game becoming pure RNG, and how "setbacks not
game-overs" stays honest: the desperate path usually just costs you, but high
social_capital can buy the occasional human grace. The exact formula is tuning;
keep it monotonic and clamp to ≥ 0.

### Effects (the consequence verbs)

Every outcome carries an `effects` object. `text` is required (the result
narration); the rest are optional:

- `pools` — deltas, clamped to [0,100] on apply.
- `flags` — booleans to set.
- `tracks` — status and/or readiness changes.
- `unlocks` — event ids to mark available (sugar for an explicit gate beyond
  `conditions`; the engine may set an `<id>_unlocked` flag).
- `schedule` — `{ event, in_turns }` to fire a future incident. This is how the
  slow-but-sure paths and downstream consequences chain.
- `slots` — optional slot delta (rare; e.g. a refund).

### Predicate grammar (for `conditions` and `requires`)

Each predicate is a single comparison; a list is AND-ed (keep it simple — no
inline boolean operators). Shape: `<path> <op> <value>`.

- `path`: `flags.<name>` | `pools.<name>` | `tracks.<name>.status` |
  `tracks.<name>.readiness` | `turn` | `mode` | `config.<name>`
- `op`: `==` `!=` `>=` `<=` `>` `<`
- `value`: `true` | `false` | a number | a quoted string

Examples: `flags.has_state_id == false`, `pools.money >= 30`,
`tracks.housing.status == "couch"`, `turn >= 4`.

The engine ships a tiny, safe evaluator for this grammar (do **not** use `eval`).
Unknown flags evaluate as `false`.

### How the seed events chain (the walking skeleton's spine)

`evt_dmv_state_id` is the hub. Its prepared path is locked until you hold both a
birth certificate and proof of address — and the hub goes quiet (the
`awaiting_birth_cert` flag) while a cert is in the mail, so it doesn't re-offer a
dead-end visit; it returns when the cert lands:

- `evt_birth_cert_arrives` (incident, scheduled by the DMV "order by mail" choice or
  the in-person referral) sets `has_birth_cert` and clears `awaiting_birth_cert`.
- `evt_proof_of_address` (action) sets `has_proof_of_address` via the sibling.
- With both, the DMV prepared path unlocks → `has_state_id` → which is the
  `condition` for `evt_apply_job_onboarding` (the payoff, where the web-dev cert
  finally matters).
- `evt_rent_due` (incident) is the money crisis with branches — the canonical
  "setback not game-over."
- `evt_parole_checkin` (obligation) is the standing slot cost; missing it schedules
  a violation.

Author one event per file under `content/events/`. New content is fill-in-the-blanks.

### Life events (the random beat)

Every run also schedules exactly one **life event** at a seed-varied mid-game turn
(weeks `LIFE_EVENT_TURN_MIN`–`MAX`), drawn from a small pool that cuts both ways — a
loss (a death in the support circle, a sudden health setback) or a blessing (an old
friend turns up; an act of unearned kindness). It's rolled at chargen from a *salted*
seed (`LIFE_EVENT_SEED_SALT`) so it's fully reproducible yet never perturbs the main
outcome RNG stream. The point is felt unpredictability: reentry throws curveballs both
ways and you never know which is coming. Like every setback, the losses branch and
recover — never a fail screen. Tunables live in `tuning.ts`.

A second, independent beat fires the same way: one random **interrupt** per run
(`INTERRUPTS` pool, its own salt/window) — a **collision** (two things you need the same
week; you can only make one), a **windfall** (good money, on a deadline that eats your
days), or an **old contact** (easy money that schedules its own reckoning a week or two
out — a second-order ripple). The collision and ripple patterns answer the field
feedback for "more interrupts, with more choices, that pull you in different directions."

---

## 10. Win and lose

There is no binary win/lose. The run produces an **ending profile** — a snapshot
across the dimensions tracked — and a **debrief** that explains how the player got
there. The debrief is the teaching payload.

### Ending profile

A status per dimension at day 90, e.g.: housing secured / precarious / lost; work
landed / leads / still searching; parole good standing / warned / violation
pending; wellbeing holding / strained / in crisis; relationships strengthened /
strained / isolated. A snapshot, not a score shown to the player.

### Trajectory scoring

Grade on momentum and decisions, not just final position:

- **Milestones hit** — got the ID, established housing, 90 days of recovery
  support, parole in good standing, a job or live leads — each contributes.
- **Trajectory** — are the pools trending up across the final ~3 turns versus
  mid-game? Rising under a hard build is a *win* on process.
- **Decision quality** — surfaced from the log: did the player take the durable
  path over the desperate one when they could?

A hard build (e.g. registry) thus stays survivable and honest. Keep any numeric
score internal; the empathy mode may use it to frame difficulty, but the player
sees the narrative debrief, never "you scored 43/100."

### Crises, not fail screens

When a pool hits a floor, fire a crisis event with branches instead of ending the
run. Money at zero → an `evt_rent_due`-style crisis (borrow / emergency aid /
negotiate / give something up). A missed check-in → a technical-violation sub-arc
that's still recoverable. Erosion, made mechanical.

### Milestones

Milestones (ID obtained, housing secured, parole good standing, 90 days clean) give
a satisfying sense of progress along the way, with no binary pass/fail.

### Terminal outcomes (rare, gated, never blunt)

A *few* genuinely terminal endings remain reachable — reincarceration from
*accumulated* violations, total collapse — but only from a chain of events, never a
single slip, and always handed to the debrief, never a bare "you failed."

### The `hardFail` config flag

- **Training mode:** `hardFail: false` by default. Terminal chains stall into a
  crisis-and-debrief instead of ending the run. Debrief emphasizes planning
  takeaways and pointers to real local resources (see hook below).
- **Empathy mode:** `hardFail` may be `true`, deliberately walking an outsider to
  the edge of the cliff. Debrief emphasizes reflection prompts and "how common is
  this barrier" framing.

### Resource-pointer hook

The training debrief should be able to surface real, local reentry resources
(housing, benefits, recovery, legal aid). The data hook is `content/resources.yaml`,
which ships a verified **national** baseline and is built so a site can add its own
**local** listings per jurisdiction. Do not hardcode resources — author them there.
*(Shipped: the national baseline renders in the training debrief and in an
always-available "Where to get help" screen — reachable from the landing page, the
in-game info card, and About — so resources never require finishing a run.)*

---

## 11. PWA, mobile, offline, accessibility

The reason for the whole stack. Assume an old Android phone, a metered plan, and
bad Wi-Fi in the room.

- **Installable** — `vite-plugin-pwa` + the manifest in `public/`. Standalone
  display, portrait, home-screen icon.
- **Offline** — service worker precaches the app shell and the compiled content
  corpus so a run works with no connection. Dexie (IndexedDB) stores saved runs;
  a player can close the tab and resume.
- **Updates** — `registerType: "prompt"`: when a new build is deployed, the app shows
  a small "new version — Refresh" banner (`src/ui/UpdatePrompt.tsx`) and applies it on
  tap, rather than silently reloading a player out of a run mid-week.
- **Lightweight** — keep the initial payload small; this is the core reason React
  was chosen over heavier web targets. Lazy-load anything non-essential.
- **Mobile-first** — single-column layout, touch targets ≥ 44px, large legible
  type, no hover-dependent interactions, thumb-reachable primary actions.
- **Accessible** — semantic HTML, labelled controls, sufficient contrast,
  screen-reader-friendly. This audience makes accessibility a requirement, not a
  nicety.

---

## 12. Content authoring workflow

1. Author an event as one YAML file under `content/events/` (or a character under
   `content/characters/`).
2. A build step loads all content, validates each event against
   `schema/event.schema.json` with AJV, and **fails the build** on any invalid or
   unknown-flag reference.
3. Valid content compiles to a JSON bundle the app imports and the service worker
   precaches.

The goal is that a colleague with domain expertise and no Dart/TS can write a new
situation by copying an existing event file and editing the prose, choices, and
effects. Keep authoring friction near zero.

---

## 13. Non-functional requirements

- **Deterministic RNG.** All randomness flows through a single seedable PRNG (e.g.
  a small mulberry32) stored in game state. Same seed + same inputs ⇒ same run.
  This makes the engine unit-testable and enables the "everyone plays the same
  character, compare outcomes" classroom mode for free.
- **Serializable runs.** Provide `serializeRun(state): string` and
  `loadRun(string): state`. Game state must be plain, JSON-safe data (pools, slots,
  tracks, flags, turn, seed, log, scheduled events, characterId, mode, config). This
  enables save/resume (Dexie) and run export.
- **Pure engine.** Engine functions take state and input, return new state. No I/O,
  no React, no globals. UI and persistence sit outside.
- **Performance budget.** Smooth on low-end Android; minimal main-thread work per
  turn; small bundle.

---

## 14. Out of scope for v1 (v2 ideas)

Not in the walking skeleton, deliberately. *(Status added post-v1.0.0.)*

- ~~Random character generation~~ — **shipped** (`randomOrigin(seed)`, "Surprise me").
- Any multiplayer/facilitator **backend** — still none, by design; the deterministic
  + serializable hooks delivered classroom/facilitator play (`character.mode.seed`
  scenario codes) **without** a backend, exactly as hoped.
- Audio, animation, high-fidelity graphics — still out.
- A real, integrated resource directory — **national baseline shipped**
  (`content/resources.yaml` ships verified national resources, rendered in the training
  debrief); a jurisdiction-specific directory / selector is still future.
- A deep build on any single track — v1 stayed thin across all four; the depth since
  has been breadth *across* tracks (now 35 events), not one track deep.

When in doubt, ship the skeleton thin and complete rather than one track deep.

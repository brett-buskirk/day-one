# Day One — development notes (Sprints 0–5, shipped as v1.0.0)

A phone-first reentry simulator, playable start-to-debrief and **live in production
(v1.0.0)**. This file is the per-sprint build log — how to run it and what was built.
The design source of truth is `docs/DESIGN.md`; the roadmap is `docs/SPRINTS.md`.

## Run it

```bash
npm install
npm run dev          # validates + compiles content, then starts Vite (http://localhost:5173)
npm run build        # typecheck + content build + production PWA build → dist/
npm run preview      # serve the production build (installable PWA)
npm test             # engine + end-to-end playthrough tests (Vitest)
npm run typecheck    # tsc -b, no emit
npm run build:content  # just the YAML→JSON content pipeline
npm run icons        # regenerate placeholder PWA icons
```

The content pipeline runs automatically on `dev`/`build` (a Vite plugin) and in
dev it re-runs + reloads when you edit anything under `content/`, `schema/`, or
the flag registry.

## What's here

- **Scaffold** — Vite 7 + React 19 + TS, `vite-plugin-pwa` (installable, offline;
  the service worker precaches the app shell *and* the compiled corpus). Manifest
  is the hand-authored `public/manifest.webmanifest`. Placeholder icons generated.
- **Content pipeline** (`scripts/compile-content.mjs`) — loads every YAML under
  `content/`, validates each event against `schema/event.schema.json` with AJV,
  and **fails the build** on invalid content or an unknown flag reference (try it:
  corrupt a seed event and run `npm run build:content`). Compiles to
  `src/content/corpus.generated.json` (gitignored; regenerated each build).
- **Engine** (`src/engine/`, no React) — seedable `mulberry32` RNG threaded
  through state; safe predicate evaluator (no `eval`); `chargen(origin)`; the
  weekly turn loop with the action budget, standing-commitment slot tax, and the
  transportation slot multiplier; weighted outcome resolution with the stat
  `modifier`; effect application (pools clamped to [0,100], flags, track
  status/readiness, unlocks, scheduling); `serializeRun`/`loadRun`. Pure
  functions; every mutator clones and returns new state.
- **UI** (`src/ui/`) — mobile-first single column, 44px+ targets, semantic/labeled
  controls, contrast-aware, reduced-motion aware. Start → turn screen (pools,
  remaining days, action cards, **locked choices shown disabled with the reason**
  — the catch-22 on screen) → forced incident cards → minimal debrief (ending
  profile, milestones, week-by-week log, resources placeholder). Minimal Dexie
  autosave/resume exercises the serialize pair.

## Sprint 2 — incidents, crises, obligations, scoring

- **Threshold triggers** (`engine.ts` `endTurn`) — pool-floor crises, *edge-triggered*
  against the previous week's snapshot so a low pool fires once on the way down
  (money ≤ 0 → `evt_money_crisis`, health ≤ 15 → `evt_health_crisis`), de-duplicated.
- **Obligations** — events tagged `obligation` are auto-presented in a "Due this
  week" section. End the week without acting on one and `endTurn` files it: legal
  standing drops, `violations` increments, and the recoverable `evt_parole_violation`
  sub-arc is scheduled for next week.
- **Crises as the failure shape** — three new branch-based events
  (`evt_money_crisis`, `evt_health_crisis`, `evt_parole_violation`), all recoverable,
  all with a free way through. No fail screens.
- **Trajectory scoring** (`debrief.ts`) — real model now: ending profile +
  milestones + momentum (mean pool vitality over the final third vs the first third
  of `poolHistory`) + a "why it landed here" read (violations, crises weathered,
  milestones). Numeric internal; narrative shown.
- **Mode-aware debrief + `hardFail`** — start screen toggles Training/Empathy.
  Training: "practice, not a prediction," surfaces the resources hook, never ends
  early (terminal chains stall into the day-90 debrief). Empathy: `hardFail` on,
  reflection prompts, and a terminal chain reachable *only* from accumulated
  violations (3+), never a single slip.
- New serializable `GameState` fields: `poolHistory`, `violations`, `terminal`
  (all migrated in `loadRun` for older saves).

## Sprint 3 — modes, archetypes, persistence, group hooks

- **Mode onboarding** (`src/ui/Onboarding.tsx`) — a step between start and play
  with the mode's emotional contract (training = practice/always-a-way-forward;
  empathy = feel-the-wall/deep-end) and a "how a week works" primer.
- **Three archetypes + character select** — Marcus (thesis), **Renae** (a
  supported build: family, money, transport — reuses the same content at a
  gentler difficulty), and **Theo** (the registry deep-end build for empathy).
  `chargen` sets a `registry_required` barrier flag and only schedules rent for
  rent-bearing housing. `evt_proof_of_address` was generalized (no longer
  couch-only; the "ask someone" choice now requires a non-isolated tie) so the
  document chain works across builds.
- **Run export/import** (`src/ui/runShare.ts`) — download/copy the serialized run
  from the debrief; paste-to-import on the start screen. The deterministic seed +
  serialization make this the classroom/facilitator hook.
- **Resource-pointer hook wired** — the pipeline loads `content/resources.yaml`
  into the corpus; the training debrief renders site-configured resources when
  present (placeholder otherwise).
- **Accessibility pass** — the modal sheet now focuses on open, traps Tab, closes
  on Escape, and restores focus; the outcome narration is an `aria-live` region.
  Plus light/dark + accent theming from the previous round.

## Sprint 4 — content breadth + balance

- **The corpus roughly doubled** (9 → 20 events; 4 → 15 player actions — the v2 pass
  below later brought it to **25 events / 18 actions**), spread across every track so
  the decision base is real: day labor, résumé workshop, housing search, recovery
  meetings, clinic enrollment, mending ties / a reentry support group, benefits
  enrollment, and a transit pass.
- **Economy fix — day labor** (`evt_day_labor`): cash work that needs no ID, pays
  now, and taxes the body. It's the early-income path the seed corpus lacked, so
  the ID→job chain is now reachable *through effort* (a sensible player reaches the
  ID around week 9 as Marcus) without being trivial. A regression test asserts
  Marcus can reach the ID across seeds.
- **Registry wall, mechanical (housing + employment)** — registry builds get
  `evt_housing_registry` (residency restrictions rule out almost everything) and
  `evt_job_registry` (background checks / occupational bars; a narrow fair-chance
  route opens only after the résumé workshop) instead of the open `evt_housing_search`
  / `evt_apply_job_onboarding`, all enforced by event conditions on
  `registry_required`. Theo stays stuck on housing even when he grinds out work, and
  lands a formal job far less often than Marcus — the registry double-bind.
- **Relationships** split cleanly: a reentry support group breaks isolation
  (isolated → one tie), then tending ties rebuilds the social_capital you spend.
- New flags: `has_resume`, `has_clinic`, `has_benefits`, `has_transit_pass`. A
  "secured housing" milestone joined the debrief.

## Sprint 5 — depth & v2 candidates (shipped in v1.0.0)

Everything past the original roadmap, built out before the first release:

- **Decision quality** (`debrief.ts`) — per-choice `durable` / `desperate` tags
  recorded in the run log and scored, so the debrief rewards taking the durable path
  over the desperate one when both were open.
- **Recurring monthly economy** (`engine.ts` `beginTurn`, turns 4/8/12) — a benefits
  stipend in, a transit-pass fee out (the pass lapses if you can't pay it), and
  probation supervision fees. Money now moves month to month, not only per event.
- **Probation as a full supervision path** — **Dana**: fees and mandated
  community-service hours as standing slot taxes; a missed obligation routes to a
  probation-specific violation (`violationEventFor`), distinct from parole's.
- **The Longtimer** — **Ray**, 24 years inside, with two new rule systems: a
  **technology gap** (`tech_gap`, derived from a long stretch inside, gating the
  skilled-job routes until `evt_digital_literacy` closes it) and **mental health** (a
  morale-floor crisis `evt_mental_health_crisis` plus a `chronic_mental_health` flag
  with `evt_counseling`).
- **Facilitator / classroom** — `character.mode.seed` scenario codes (a run is fully
  determined by who + framing + seed), surfaced on the start screen, the in-game info
  (ⓘ) card, and the debrief, so a room plays the *identical* run and compares choices.
- **Random character generation** — `randomOrigin(seed)` builds a coherent,
  deterministic person behind a "Surprise me" option, reproducible as `random.mode.seed`.
- **Public shell** — a landing page and About screen with the procedural sunrise
  logo, plus light/dark + accent theming.
- The corpus reached **25 events / 18 actions** across all four tracks.

## Verified

- 84 tests pass (engine, Sprints 2–4 + registry employment + decision-quality +
  recurring economy + probation + the longtimer/tech-gap/mental-health + scenario codes + random generation +
  end-to-end playthrough): RNG determinism,
  serialize round-trip (incl. the new fields + old-save migration), transport
  multiplier, predicate eval, weighted resolution, the full document catch-22 chain,
  once-per-turn actions, obligation miss → violation sub-arc, pool-floor crisis
  triggers (incl. no-spam edge-trigger), trajectory momentum, mode-aware framing,
  terminal-only-under-hardFail, and a deterministic 13-week playthrough across 40
  seeds (no throws, pools always in bounds).
- Live diagnostic: training-diligent finishes 13 weeks with 0 violations; training
  that skips every check-in racks up violations but still reaches the debrief
  (terminal stalled); empathy that skips check-ins ends early (terminal) at week 3.
- `npm run build` produces an installable, offline PWA (~122 KB gzipped JS).
- The content build fails loudly on a corrupted event or an unknown flag.
- **CI** (`.github/workflows/ci.yml`) runs content validation + typecheck + tests +
  build on every PR and push to `main`; `main` is protected (no direct pushes).

## Status & what's next

- **Roadmap complete through v1.0.0** (Sprints 0–5 above). `main` is protected;
  CI runs on every PR; deploys are automatic on merge to `main`.
- **Economy balance** — the early game is deliberately tight (the ID path costs money
  the player barely has: gate money → pool 15; the mail-order birth cert costs 25;
  the prepared DMV path needs money ≥ 30). Sprint 4's **day labor** — ID-free cash
  work that taxes the body — made the ID→job chain reachable *through effort* (a
  regression test asserts Marcus reaches the ID across seeds) without making it
  trivial. Ongoing balance and field-testing are the main remaining tuning work; the
  knobs all live in `src/engine/tuning.ts`.
- **Canonical `GameState`** grew serializable fields as features landed —
  `standingSlots`, `pending`, `actedThisTurn` (S1); `poolHistory`, `violations`,
  `terminal` (S2) — all JSON-safe and migrated in `loadRun` for older saves.
- **Resource directory (national baseline shipped):** `content/resources.yaml` now
  ships eight verified national U.S. resources (NRRC, 988, SAMHSA, 211, CareerOneStop,
  Benefits.gov, HRSA, LawHelp), surfaced via a shared `ResourceList` both in the
  training debrief and in an **always-available "Where to get help" screen** reachable
  from the landing page, the in-game info (ⓘ) card, and About — so help never requires
  finishing or even starting a run. Still open: jurisdiction-specific **local** listings
  (the file documents how to add them) and an optional jurisdiction selector.
- **Content breadth (ongoing):** a transportation/housing pass added three events
  (license restoration, a community/used bike, and recovery housing) — now **28 events
  / 21 actions**, with transportation no longer a one-event track. More authored events
  and archetypes still welcome.
- **Still open:** the local resource listings above, more archetype diversity, and
  ongoing balance/field-testing.
```

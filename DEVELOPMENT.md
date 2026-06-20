# Day One — development notes (Sprints 0–4)

The walking skeleton: a phone-first reentry simulator, playable start-to-debrief.
This file covers how to run it and what was built. The design source of truth is
`docs/DESIGN.md`; the roadmap is `docs/SPRINTS.md`.

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

- **The corpus roughly doubled** (9 → 20 events; 4 → 15 player actions), spread
  across every track so the decision base is real: day labor, résumé workshop,
  housing search, recovery meetings, clinic enrollment, mending ties / a reentry
  support group, benefits enrollment, and a transit pass.
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

## Verified

- 59 tests pass (engine, Sprints 2–4 + the registry employment wall, end-to-end
  playthrough): RNG determinism,
  serialize round-trip (incl. the new fields + old-save migration), transport
  multiplier, predicate eval, weighted resolution, the full document catch-22 chain,
  once-per-turn actions, obligation miss → violation sub-arc, pool-floor crisis
  triggers (incl. no-spam edge-trigger), trajectory momentum, mode-aware framing,
  terminal-only-under-hardFail, and a deterministic 13-week playthrough across 40
  seeds (no throws, pools always in bounds).
- Live diagnostic: training-diligent finishes 13 weeks with 0 violations; training
  that skips every check-in racks up violations but still reaches the debrief
  (terminal stalled); empathy that skips check-ins ends early (terminal) at week 3.
- `npm run build` produces an installable, offline PWA (~109 KB gzipped JS).
- The content build fails loudly on a corrupted event or an unknown flag.

## Open notes for review

- **Seed economy is very tight (top tuning item, still open).** There is no early
  income source among the seed events that doesn't require the state ID, while the
  ID path costs money the player barely has (gate money → pool 15; ordering the
  birth cert by mail costs 25; the prepared DMV path needs money ≥ 30). A naive
  player reliably reaches *proof of address, parole good standing, and recovery
  support* and often the *birth certificate*, but typically ends day 90 still
  short of the ID — precarious, not failed, consistent with the design ("a hard
  build may end precarious through no bad play"). The ID→job chain is
  **mechanically verified end-to-end**; it's the *balance*, not the wiring, that
  gates it. The new crisis events add small relief paths but don't change this.
  Likely levers: a small early-income action, a lower mail-order cost, or starting
  money tuning. Trajectory momentum reads "slipping" for most runs because of this.
- **Seed-content fixes (authoring omissions):** `evt_dmv_state_id`,
  `evt_proof_of_address`, and `evt_apply_job_onboarding` were marked
  `repeatable: true` so they can be revisited across weeks; the parole prompt had a
  dev note (`see docs/DESIGN.md §4`) stripped from player-facing prose.
- **Canonical `GameState` was extended** with serializable fields as features
  landed: `standingSlots`, `pending`, `actedThisTurn` (Sprint 1) and `poolHistory`,
  `violations`, `terminal` (Sprint 2). All are JSON-safe and migrated in `loadRun`.
- **Candidate next steps (v2):** recurring costs (a transit pass that lapses,
  monthly benefits); per-choice "durable vs desperate" tags to make decision-quality
  scoring choice-level rather than derived from violations/crises/milestones;
  probation-specific obligations (the check-in obligation is parole-only today);
  facilitator/classroom features on the existing seed-determinism + export hooks;
  and random character generation. *(Done since Sprint 4: the registry barrier now
  reshapes employment as well as housing — `evt_job_registry`.)*
```

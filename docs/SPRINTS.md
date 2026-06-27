# Day One — build roadmap

> **Status:** Sprints 0–3 are **complete** (v1.0.0), and the Sprint 4+ (v2)
> candidates have all shipped; the resource directory now ships a **national
> baseline**, with local/jurisdiction listings the remaining enhancement (see §10/§14
> of `docs/DESIGN.md`). This file is the original roadmap, kept for history; for what
> actually shipped, sprint by sprint, see [`DEVELOPMENT.md`](../DEVELOPMENT.md).

Sprints are vertical slices, not horizontal layers. Each one ends with something
that runs. Sprint 1 is the **walking skeleton**: thin across every subsystem,
playable end-to-end. Depth comes later.

Read `docs/DESIGN.md` first — it is the source of truth for everything below.

---

## Sprint 0 — scaffold and pipeline ✓

**Goal:** an empty-but-correct PWA that compiles validated content.

- Scaffold Vite + React + TypeScript.
- Configure `vite-plugin-pwa` (installable, offline, using
  `public/manifest.webmanifest`). Add placeholder icons.
- Add Dexie, AJV, and a YAML loader. Install current versions.
- Build the content pipeline: load all YAML under `content/`, validate each event
  against `schema/event.schema.json`, fail the build on invalid content or unknown
  flag references, and compile a JSON corpus bundle the app imports.
- Add a seedable PRNG utility (e.g. mulberry32) and the predicate evaluator from
  the design doc (no `eval`).
- Keep `src/engine/types.ts` as the canonical types.

**Done when:** the dev server runs, the app installs as a PWA, and the build fails
loudly if you corrupt a seed event.

---

## Sprint 1 — the walking skeleton ✓

**Goal:** a playable run, start to debrief, on a phone.

- Implement `chargen(origin)` and load the Marcus build into initial game state.
- Implement the weekly turn loop (§4): slot budget, the transportation multiplier,
  presenting eligible `action` events, ending the week.
- Implement action resolution: pick a choice → roll weighted outcomes (with
  `modifier`) → apply effects (clamp pools, set flags, move tracks, append to log).
  Wire `serializeRun()`/`loadRun()` now.
- Build the turn screen, mobile-first: visible pools, remaining slots, the action
  menu with locked choices shown disabled (the catch-22, on screen).
- Advance through ~13 turns to a minimal debrief: the ending profile snapshot and
  the run log. Trajectory scoring can be a stub here.
- Use the six seed events; confirm they chain (order cert → cert arrives → proof of
  address → DMV prepared path unlocks → ID → job onboarding).

**Done when:** someone can play Marcus through 90 days on a phone, see the document
catch-22 enforced, hit a rent crisis without dying, and reach a debrief. **Stop and
summarize for review.**

---

## Sprint 2 — incidents, crises, scoring ✓

**Goal:** the loop gets its teeth and its fairness.

- Incident scheduling and threshold triggers (rent due, birth cert arrives,
  pool-floor crises).
- Obligations (parole check-in auto-presented; missing it schedules a violation
  sub-arc).
- Crisis branching as the standard failure shape (no fail screens).
- Milestones and the trajectory scoring model (§10). Mode-aware debrief framing.

**Done when:** setbacks compound and recover, milestones register, and the debrief
explains *why* the run landed where it did.

---

## Sprint 3 — modes, persistence, group hooks ✓

**Goal:** serve both audiences and make runs durable.

- Training vs empathy onboarding and the `hardFail` flag (off by default in
  training).
- More archetypes, including a registry deep-end build for empathy mode.
- Save/resume runs via Dexie; run export (the serialized run — the classroom hook).
- The placeholder resource-pointer hook for the training debrief.
- Mobile and accessibility polish pass.

**Done when:** both modes feel distinct, a run survives closing the tab, and a run
can be exported.

---

## Sprint 4+ — depth (v2)

- ✓ Broaden the corpus per track (now **67 events** across all four tracks).
- ✓ Random character generation (`randomOrigin(seed)` — the "Surprise me" build).
- ✓ Classroom/facilitator features on the deterministic + export hooks
  (`character.mode.seed` scenario codes).
- ◐ A jurisdiction-specific resource directory — **national baseline shipped**:
  `content/resources.yaml` ships verified national resources, surfaced in the training
  debrief and an always-available "Where to get help" screen. Local/jurisdiction
  listings (and an optional selector) are still open.

---

## A note on sequencing

The temptation is to build one track (say employment) all the way out because it
feels productive. Resist it. The whole point of reentry is that the tracks
interact, so a thin slice through *all four* teaches more, sooner, than one deep
track — and it surfaces integration problems early while they're cheap to fix.

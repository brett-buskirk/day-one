# Day One

A reentry simulator. The player takes a character who was recently released from
prison and lives the first ninety days home — finding an ID, housing, work, and
footing — one weekly turn at a time, against a budget of hours that never quite
covers everything that's due.

It is built for two audiences, weighted equally:

- **Returning citizens (RCs)** preparing for release, to set realistic
  expectations and rehearse hard decisions in a safe place.
- **Outsiders** — staff, volunteers, the public — to understand what reentry
  actually demands, in their gut and not just their head.

It is deliberately not a high-graphics video game. Think Oregon Trail meets the
"Spent" poverty simulator: data-driven, decision-heavy, light to run on a phone.

---

## What this package is

A design-and-content handoff, not the finished app. It exists so the Claude Code
build starts from a populated walking skeleton instead of an empty `lib/` — the
design is written down, the data contracts are real code, and there is enough
seed content for the game to run end-to-end on day one.

The build itself is the next step. See the kickoff prompt below.

---

## Stack (decided)

A lean **React PWA**, chosen because the audience is phone-first — many RCs have a
phone long before a computer, often older Android on metered data — and a React
web payload is dramatically lighter on that hardware than the alternatives.

- **React + TypeScript** — UI and the typed engine contracts.
- **Vite** — build tooling and dev server.
- **vite-plugin-pwa** — installable to the home screen, offline once cached,
  instant updates, no app store.
- **Dexie (IndexedDB)** — saved runs and the cached content corpus, so a player
  can close the tab on the bus and resume later.
- **AJV** — validates authored content against the event JSON Schema at build time.
- **YAML → JSON content build** — colleagues author events in YAML; a build step
  validates and compiles them into a JSON bundle the app imports.

The engine is pure functions over plain data and is framework-agnostic by intent.
None of the design in `docs/DESIGN.md` depends on React; React only renders state
and collects taps.

> When scaffolding, install **current** versions of these libraries rather than
> pinning to anything in this doc.

---

## How to use this with Claude Code

1. Drop this whole tree into a new, empty git repo.
2. Open a Claude Code session at the repo root.
3. Paste the kickoff prompt below as your first message.

### Kickoff prompt

```
This repo is the design handoff for "Day One", a phone-first reentry simulator
built as a React PWA. Before writing code, read docs/DESIGN.md (the source of
truth) and docs/SPRINTS.md (the build roadmap) in full.

Then:

1. Scaffold a Vite + React + TypeScript project configured as an installable,
   offline-capable PWA using vite-plugin-pwa. Add Dexie, AJV, and a YAML loader.
   Install current versions. Use public/manifest.webmanifest as the starting
   manifest. Keep src/engine/types.ts as the canonical types.

2. Build the content pipeline: load every YAML file under content/, validate each
   event against schema/event.schema.json with AJV, fail the build on any invalid
   event, and compile the corpus into a JSON bundle the app imports.

3. Implement the engine exactly as specified in docs/DESIGN.md — the weekly turn
   loop with an action budget, the five resource pools, the transportation slot
   multiplier, weighted outcome resolution, and effect application. Two hard
   requirements: the RNG must be seedable/deterministic, and there must be a
   serializeRun()/loadRun() pair. Do not skip these — later features depend on them.

4. Complete Sprint 0 and Sprint 1 from docs/SPRINTS.md only. The deliverable is a
   game that loads the Marcus build and is playable end-to-end through all ~13
   weekly turns using the six seed events, ending in a minimal debrief. Stop there
   and summarize what you built so I can review before Sprint 2.

Constraints throughout: mobile-first single-column layout, 44px+ touch targets,
legible text, works on low-end Android, and accessible (semantic HTML, labels,
contrast). Barriers are enforced as data preconditions, never hardcoded. The game
never shows a "you lost" screen — see the win/lose model in the design doc.
```

---

## Map of the package

```
day-one/
├── README.md                          you are here
├── docs/
│   ├── DESIGN.md                      the source of truth — read first
│   └── SPRINTS.md                     build roadmap, Sprint 0 → v2
├── src/
│   └── engine/
│       └── types.ts                   canonical TypeScript contracts
├── schema/
│   └── event.schema.json              JSON Schema authored events validate against
├── content/
│   ├── characters/
│   │   └── marcus.yaml                the seed archetype (origin only)
│   └── events/                        six chained seed events
│       ├── evt_dmv_state_id.yaml
│       ├── evt_proof_of_address.yaml
│       ├── evt_birth_cert_arrives.yaml
│       ├── evt_apply_job_onboarding.yaml
│       ├── evt_rent_due.yaml
│       └── evt_parole_checkin.yaml
└── public/
    └── manifest.webmanifest           PWA manifest (icons to be added)
```

---

## Design north stars (the non-negotiables)

These are the few things that, if dropped, break the point of the project. They
are expanded in `docs/DESIGN.md`, but if a build decision ever conflicts with one
of these, this list wins.

1. **Setbacks, not game-overs.** Running out of money is a crisis with branches,
   not death. Scoring rewards trajectory and good decisions under constraint, not
   just final position — so a hard build is survivable and honest, never
   demoralizing.
2. **Barriers are preconditions, not prose.** Every obstacle is enforced in data
   as a `requires` on a choice or a `condition` on an event. The catch-22 is a
   button the player can see and can't press yet.
3. **Two audiences, one engine.** Training mode and empathy mode share the engine
   and the corpus. The only differences are onboarding copy, difficulty defaults,
   debrief framing, and a single `hardFail` flag (off by default in training).
4. **Group-ready for free.** The engine is deterministic (seedable RNG) and runs
   are serializable. Build those in from the start; they cost almost nothing now
   and a rewrite later, and they keep facilitator/classroom modes available.
5. **Phone-first, offline, accessible.** The whole reason for the stack. Assume an
   old Android phone on a metered plan in a room with bad Wi-Fi.

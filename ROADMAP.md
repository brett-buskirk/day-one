# Roadmap

Where Day One is headed. This is a living document and the *forward* look — the source
of truth for what's already **shipped** is [`CHANGELOG.md`](CHANGELOG.md). Nothing here
is a promise or a date, just the current order of intent.

Any change has to hold to the design north stars in
[`docs/DESIGN.md`](docs/DESIGN.md); [`CONTRIBUTING.md`](CONTRIBUTING.md) covers how to
land one.

## Recently shipped

Through **v1.6.0** (see [`CHANGELOG.md`](CHANGELOG.md) for detail):

- **The contributor pipeline** — structured issue forms (bug / feature / archetype /
  event), a "view source" link, and an AI-assisted triage Action that posts a Claude
  first-read on each new issue for maintainer review.
- **Secure-facility build mode** — `VITE_SECURE_BUILD=1` ships a separate artifact with the
  "Where to get help" resources and external links stripped, for in-facility deployments.
- **Court debt with teeth** — ignore it once you're earning and it garnishes your paycheck
  weekly, then escalates to a bench-warrant crisis.
- **Nine character archetypes** + a generated random build; training and empathy modes —
  including a young first-timer, a "has it all" contrast build, and a parent with a
  **custody arc** (weekly supervised visits + a stability-gated hearing).
- **Random life events** — one unexpected loss or blessing per run.
- A reentry **resource directory** ("Where to get help"), reachable any time.
- Transportation & housing **ladders** (you only ever move up); the live **situation
  panel**; pool-change feedback.
- A clearer document chain; UX & accessibility polish; an installable, offline PWA.
- **The technology layer** — a phone (with a recurring plan bill that can lapse) and a
  laptop that gates remote skilled work, each with a real subsidized path (Lifeline; a
  workforce refurb-laptop program).
- **A reentry fee-waiver** that breaks the document poverty trap, and harness-validated
  **day-budget tuning** (a 7-day week; reliable transit removes the errand tax).
- **A second stage of reentry** — court debt, deferred health, giving back, sealing your
  record, getting off supervision early, and mending family, so stabilizing isn't the end.

## Next up

Grouped by theme. Items tagged _(pass-2 review)_ / _(pass-3 review)_ came out of live
playtests; _(discuss first)_ marks a design question to settle before building.

### Fixes & polish _(pass-3 review)_

- **Debrief uses a hardcoded male pronoun (high).** The intro reads "…how *he* got there"
  for every build — it only surfaces on the female builds (Renae, Dana, Gloria, Tasha),
  since the original roster was all male. Thread the character's pronouns into the debrief
  intro (`src/ui/DebriefScreen.tsx`) and audit other gendered strings. A misgendered debrief
  is the wrong note for a dignity-first tool — fix promptly.
- **Doc accuracy: probation → home detention, then a full re-read.** `docs/DESIGN.md`
  (§6 Tracks, and elsewhere), `docs/ABOUT.md`, and `README.md` (Dana's card) still say
  "probation" where Dana is on **home detention**; correct them, then re-read each doc
  end-to-end. Also drop the default DigitalOcean URL from `README.md`.
- **Render markdown in event prompts (low).** The state-ID prompt shows literal
  `**birth certificate**`; onboarding renders bold fine, so it's a per-component gap —
  render markdown in `src/ui/EventDetail.tsx` (or strip `**` from content), and scan all
  prompts for stray markup.
- **"Cna" → "CNA" (low).** Tasha's card title-cases her credential (`cert_cna`); fix the
  acronym casing and check other credential/acronym displays.

### Accessibility _(pass-2 review)_

- **Audit modal a11y on the newer surfaces (medium).** Confirm the modals added after the
  original Sprint-3 pass — the "Your situation" panel, "End this run?", the update prompt,
  and "Where to get help" — all trap focus, close on Escape, restore focus, and label their
  controls, so the guarantee is systemic. *(Pass 3 confirmed the locked-choice and
  character-select a11y and the debrief `aria-label` are shipped and correct.)*
- **Real-device ~360px pass + reduced-motion spot-check (low).** Reviews ran at ~500px;
  verify thumb reach / scrolling on a real phone, and that the pool-delta pulse honors
  `prefers-reduced-motion`.

### Balance & systems _(pass-3 review)_

- **Second-stage arcs fire on employment alone — in week 1 (medium).** "Reach back," "The
  body keeps the score," and "Make the call you've been avoiding" all open the instant a job
  lands, cluttering the survival phase the 1.5.0 work meant to protect. Tighten their gates
  (require a few stable weeks, not just `has_job`) in `src/engine/tuning.ts` / the event
  conditions.
- **Verify the custody hearing's housing gate is reachable (verify).** "Make your case" needs
  `housing.readiness >= 3` (transitional), but transitional housing sits behind a waitlist and
  Tasha starts on a couch. Confirm with the **budget-sim harness** that a housing-first player
  can clear the waitlist before the fixed week-9 hearing; if not, the best path is unwinnable
  through no fault of the player (the `ask_for_time` fallback keeps it from being a *fail*, but
  an unreachable best path still undercuts the arc).
- **Reassess the milestone system (discuss first).** "Stay in Recovery Support" can be
  permanently unmeetable for builds that never surface recovery — a "locked-forever" miss on a
  path that never opened. Make milestone availability/scoring **data-driven** so a milestone
  only appears (or only scores) where its pathway can surface under normal play; consider
  reframing "Stay in Recovery Support" more broadly (a pro-social support routine — community,
  faith, mentorship). Reproducible from character + mode + seed; no hardcoded exceptions; don't
  break builds where it works today. *Open questions: which builds never surface recovery;
  global-conditional vs build-specific milestone catalogs; how milestones weight scoring; which
  other milestones feel obsolete.*

### New characters & content

- **Deepen the custody arc** — the reunifying parent ships with weekly visits and a
  stability-gated hearing; a child-support economy drain and a second review/appeal would
  give it more texture.
- **Surface Tasha's recovery in her bio + situation panel** _(pass-3)_ — her recovery
  (`in_recovery`, `mandated_treatment`, a `drug_felony`) is authored and intentional, but her
  `summary` and the situation panel are all about custody, so recovery content reads as a
  non-sequitur in play. Surface it (a `summary` line + a treatment note in the panel); don't
  gate it — her recovery is part of *why* custody is hard.
- **Show the custody hearing goal in the situation panel** _(pass-3)_ — the panel omits her
  daughter and the hearing, her whole reason for the run. Add **"Custody hearing: week 9"**
  plus her standing on the three gates (housing ≥ transitional, clean record, money ≥ 40),
  turning the hidden catch-22 into a visible, actionable goal.
- **More content depth** — widen the thinnest tracks, especially the registry/employment
  wall and the relationships path, so repeat runs keep surfacing fresh decisions.
- **More life events** — the random loss/blessing pool is four deep; more variety keeps
  the beat fresh across replays.

### Tooling & docs

- **Facilitator guide** — a short doc for running the classroom/group mode (shared seed
  codes, debrief discussion prompts) in a training or workshop setting.

## Later / ideas

Not scheduled, but on the table:

- A printable or shareable **debrief summary** (beyond the run-export JSON).
- More **crisis branches** and second-order consequences on the legal track.
- Light **localization** scaffolding (the content is already data, not code).
- An **author/preview** mode for content contributors.

## How this roadmap works

- **Shipped → [`CHANGELOG.md`](CHANGELOG.md).** This file only looks forward.
- Each item lands as its own PR through green CI (see [`CONTRIBUTING.md`](CONTRIBUTING.md)).
- Difficulty and barriers are authored in **content / tuning data**, never hardcoded:
  adding a character is mostly an origin YAML, and adding an obstacle is a `requires`
  on a choice or a `condition` on an event.
- Have an idea, or a build you'd want to play? Open an issue.

# Roadmap

Where Day One is headed. This is a living document and the *forward* look — the source
of truth for what's already **shipped** is [`CHANGELOG.md`](CHANGELOG.md). Nothing here
is a promise or a date, just the current order of intent.

Any change has to hold to the design north stars in
[`docs/DESIGN.md`](docs/DESIGN.md); [`CONTRIBUTING.md`](CONTRIBUTING.md) covers how to
land one.

## Recently shipped

Through **v1.7.0** (see [`CHANGELOG.md`](CHANGELOG.md) for detail):

- **Milestones that fit the build** — the debrief only scores paths a build can walk
  ("supervision in good standing" for supervised builds; an *earned* "kept a support routine"
  via recovery meetings or a new community / mentorship circle), so the tally is honest per
  build instead of penalizing a run for a door the game never opened.
- **A review-driven polish pass** — the debrief no longer misgenders (per-character
  pronouns); the second-stage arcs wait for the mid-game instead of firing in week 1; Tasha's
  custody hearing and recovery are legible in the situation panel; plus a sweep of doc /
  accuracy and small display fixes.
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

Grouped by theme. The _(pass-2 review)_ items came out of a live playtest.

### Accessibility _(pass-2 review)_

- **Audit modal a11y on the newer surfaces (medium).** Confirm the modals added after the
  original Sprint-3 pass — the "Your situation" panel, "End this run?", the update prompt,
  and "Where to get help" — all trap focus, close on Escape, restore focus, and label their
  controls, so the guarantee is systemic. *(Pass 3 confirmed the locked-choice and
  character-select a11y and the debrief `aria-label` are shipped and correct.)*
- **Real-device ~360px pass + reduced-motion spot-check (low).** Reviews ran at ~500px;
  verify thumb reach / scrolling on a real phone, and that the pool-delta pulse honors
  `prefers-reduced-motion`.

### New characters & content

- **Deepen the custody arc** — the reunifying parent ships with weekly visits and a
  stability-gated hearing; a child-support economy drain and a second review/appeal would
  give it more texture.
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

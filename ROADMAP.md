# Roadmap

Where Day One is headed. This is a living document and the *forward* look — the source
of truth for what's already **shipped** is [`CHANGELOG.md`](CHANGELOG.md). Nothing here
is a promise or a date, just the current order of intent.

Any change has to hold to the design north stars in
[`docs/DESIGN.md`](docs/DESIGN.md); [`CONTRIBUTING.md`](CONTRIBUTING.md) covers how to
land one.

## Recently shipped

Through the latest `[Unreleased]` (see [`CHANGELOG.md`](CHANGELOG.md) for detail):

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

Grouped by theme. Items tagged _(pass-2 review)_ or _(playtest notes)_ came out of a
second live playtest.

### Accessibility _(pass-2 review)_

- **Name the character-select radios (medium).** Give each `role="radio"` an explicit,
  concise accessible name (character + build + the key facts already shown).
- **Audit modal a11y on the newer surfaces (medium).** Confirm the modals added after
  the original Sprint-3 pass — the "Your situation" panel, "End this run?", the update
  prompt, and "Where to get help" — all trap focus, close on Escape, restore focus, and
  label their controls, so the guarantee is systemic.
- **Real-device ~360px pass + reduced-motion spot-check (low).** Both reviews ran at
  ~500px; verify thumb reach / scrolling on a real phone, and that the pool-delta pulse
  honors `prefers-reduced-motion`.

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

### Contributor pipeline ✓

The on-ramp is in place (details in [`CHANGELOG.md`](CHANGELOG.md)): the repo's **labels,
milestones, and project board**; a **"view source"** link; structured **issue forms** (bug,
feature, archetype, event); and an **AI-assisted triage** GitHub Action that posts a Claude
first-read — well-formed? on-thesis? how would it map to the data model? — on each new issue
for **maintainer review** (human-in-the-loop; it never decides, labels-as-final, or actions).
One step activates it: add an `ANTHROPIC_API_KEY` repository secret.

### Deployment ✓

- **Secure-facility build mode** — shipped (details in [`CHANGELOG.md`](CHANGELOG.md) /
  [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)): `VITE_SECURE_BUILD=1 npm run build` is a
  build-time artifact that strips the **"Where to get help"** resources (omitted from the
  bundle entirely) and the GitHub link, so a secure-environment deployment has no
  outside-world surfaces to dead-end on.

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

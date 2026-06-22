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

## Next up

Grouped by theme. Items tagged _(pass-2 review)_ or _(playtest notes)_ came out of a
second live playtest.

### Accessibility _(pass-2 review)_

- **Announce locked choices in event sheets (high).** The locked-move-with-its-reason
  is the core teaching device, but locked choices use the native `disabled` attribute —
  so they're dropped from the screen-reader tree and the unmet-requirement text (already
  wired via `aria-describedby`) is never announced. Switch to `aria-disabled` plus an
  onClick guard so the wall is announced, not just drawn.
- **Name the character-select radios (medium).** Give each `role="radio"` an explicit,
  concise accessible name (character + build + the key facts already shown).
- **Audit modal a11y on the newer surfaces (medium).** Confirm the modals added after
  the original Sprint-3 pass — the "Your situation" panel, "End this run?", the update
  prompt, and "Where to get help" — all trap focus, close on Escape, restore focus, and
  label their controls, so the guarantee is systemic.
- **Real-device ~360px pass + reduced-motion spot-check (low).** Both reviews ran at
  ~500px; verify thumb reach / scrolling on a real phone, and that the pool-delta pulse
  honors `prefers-reduced-motion`.

### Gameplay fixes

- **Transportation ladder** _(playtest notes)_ — getting-around should scale like
  housing, so an option you already took retires instead of re-offering. Today
  `evt_get_bike` gates only on the `transportation` pool, so someone who already has a
  bike but low mobility is offered another. Model a ladder (none → bike → transit pass →
  car), or at minimum a `has_bike` gate.
- **Document-chain clarity** _(playtest notes)_ — the "Getting your state ID" hub
  conflates the ID with its prerequisite **birth certificate** (two different
  documents), and it keeps reappearing with no useful action while you wait on a mailed
  cert. Clarify the framing, and quiet the hub until the cert arrives.

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

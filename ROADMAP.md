# Roadmap

Where Day One is headed. This is a living document and the *forward* look — the source
of truth for what's already **shipped** is [`CHANGELOG.md`](CHANGELOG.md). Nothing here
is a promise or a date, just the current order of intent.

Any change has to hold to the design north stars in
[`docs/DESIGN.md`](docs/DESIGN.md); [`CONTRIBUTING.md`](CONTRIBUTING.md) covers how to
land one.

## Recently shipped

Through **v1.2.1** (see the changelog for detail):

- Six character archetypes + a generated random build; training and empathy modes.
- A reentry **resource directory** ("Where to get help"), reachable any time.
- Transportation & housing content; the live **situation panel**; pool-change feedback.
- A **housing ladder** so housing only moves up (street → couch → transitional → rental).
- UX & accessibility polish; an installable, offline PWA.

## Next up

In rough priority order:

1. **Reunifying-parent archetype** — a build whose central pressure is family court,
   custody, and child support. Needs a small arc of family/court events plus the origin
   data. The hardest, most human path we haven't modeled yet.
2. **Young first-timer archetype** — short time inside, no work history; the barrier is
   inexperience and thin support rather than a long gap. Mostly origin data.
3. **More content depth** — widen the thinnest tracks, especially the
   registry/employment wall and the relationships path, so repeat runs keep surfacing
   fresh decisions.
4. **Facilitator guide** — a short doc for running the classroom/group mode (shared
   seed codes, debrief discussion prompts) in a training or workshop setting.

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

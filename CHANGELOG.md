# Changelog

All notable changes to Day One are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Reentry resource directory** — surfaces a verified national baseline of free
  resources (National Reentry Resource Center, 988, SAMHSA, 211, CareerOneStop,
  Benefits.gov, HRSA, LawHelp), with a documented hook for sites to add their own
  local listings in `content/resources.yaml`.
- **Always-available "Where to get help" screen** — the resource directory is now
  reachable from the landing page, the in-game info (ⓘ) card, and About — not only the
  end-of-run debrief — so help never requires finishing, or even starting, a run.
- Screenshots in the README.

### Changed
- Renamed the debrief's resources section from "Local resources" to "Where to get
  help" (the baseline is national; sites can add local resources).
- Documentation accuracy pass across `README.md`, `CLAUDE.md`, `DEVELOPMENT.md`, and
  `docs/` so everything matches the shipped v1.0.0.
- Tuned Dependabot to ignore major-version bumps and batch minor/patch updates
  monthly (keeps dependency PRs quiet; security updates still come through).
- Updated CI runner actions (`actions/checkout` v7, `actions/setup-node` v6).

## [1.0.0] - 2026-06-20

First public release — a phone-first **reentry simulator**: live the first ~90 days
after release, one weekly turn at a time, as an installable, offline PWA.

### Added
- **Turn loop** — a week is a turn: an action-slot budget, the transportation slot
  multiplier, and standing-commitment slot taxes from supervision conditions.
- **Resource pools** — money, morale, social_capital, transportation, health, each
  clamped to [0, 100], with edge-triggered floor crises (no fail screens).
- **Tracks** — employment, housing, legal, and relationships, advanced by authored
  events.
- **Content pipeline** — events and characters authored as YAML, validated against a
  JSON schema and a flag registry, compiled to an offline corpus (the build fails
  loudly on invalid content). 25 events / 18 actions across all four tracks,
  including the document catch-22 spine (birth certificate → proof of address →
  state ID → job).
- **Characters** — five hand-authored builds (Marcus, Renae, Dana, Theo, Ray) plus
  deterministic random generation behind a "Surprise me" option.
- **Two modes, one engine** — Training and Empathy, differing only in onboarding,
  difficulty defaults, debrief framing, and the `hardFail` flag.
- **Supervision & consequences** — parole and probation obligations with recoverable
  violation sub-arcs; a recurring monthly economy (benefits stipend in, transit-pass
  fee and supervision fees out); terminal endings only from accumulated violations.
- **Debrief** — ending profile, milestones, trajectory momentum, durable-vs-desperate
  decision quality, and mode-aware framing.
- **Determinism & portability** — a seedable RNG threaded through state;
  serialize/load; save/resume via IndexedDB; run export/import; and
  `character.mode.seed` scenario codes so a group can play the identical run.
- **PWA** — installable, works offline (the service worker precaches the app shell
  and corpus); mobile-first and accessible; light/dark + accent theming; a landing
  page, About screen, and in-game info card.
- **Resource-pointer hook** — `content/resources.yaml`, surfaced in the training
  debrief when populated (ships empty for jurisdictions to fill).
- **Tooling** — MIT license, CI (content validation + typecheck + tests + build),
  and self-host deployment paths (Dockerfile + nginx.conf, plus DigitalOcean).

### Deployed
- Live at [dayone-sim.app](https://dayone-sim.app) on DigitalOcean App Platform.

[Unreleased]: https://github.com/brett-buskirk/day-one/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/brett-buskirk/day-one/releases/tag/v1.0.0

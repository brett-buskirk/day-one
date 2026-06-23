# Changelog

All notable changes to Day One are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **A laptop gates remote skilled work** (technology resource, Phase 3). The remote dev
  role genuinely needs a computer — so a certified build that came home without one (Marcus)
  is *qualified and walled off*: the dev job shows as a **visible locked "Need a laptop"**
  button (the catch-22 the whole design is built around), with a path out — a new **"Get a
  computer"** action to buy a refurbished machine or apply to a **workforce refurb-laptop
  program**. Only that one skilled route is gated; every other job needs no laptop, so work
  at large stays open. (Gloria, the "has it all" build, comes home with one.)
- **The phone pays off** (technology resource, Phase 2). A new phone-only **"Work the
  phone"** action lets you do the legwork *remotely* — chase job leads (employment progress)
  or return calls and keep your network close (support) — without spending a bus fare on
  every errand. It's a **soft advantage, not a gate**: builds without a phone aren't blocked
  from work or housing, they just lean on the slower, travel-heavy in-person paths. Once a
  week, so it's a modest option, not a grind. (Phase 1 made the phone a cost; this makes it
  worth keeping.)

### Changed
- **The transport squeeze is now attributable** (reviewer Area 1 — the day budget shouldn't
  read as *arbitrarily* tight). When getting around without a car inflates errands, the turn
  header says so ("On foot, every errand across town costs double — a bus pass or car would
  ease the squeeze"), and each travel card shows the multiplier (`travel ×2`) instead of a
  bare "travel" tag. Same costs as before — now you can see *why* the week is tight, and what
  would loosen it.

## [1.4.0] - 2026-06-22

A reentry-realism release shaped by returning-citizen and reviewer feedback: getting a job
now pays a **weekly wage**, **home detention** becomes its own supervision status (with its
own weekly fee and check-in), a **phone** is a resource whose monthly plan is a recurring
burden, and more of the **unexpected** — collisions, windfalls, and old contacts — now
interrupts the plan. Plus the driver's-license-vs-car split and a batch of situation-panel
and content-fit fixes.

### Added
- **A phone is a resource now** (from lived-experience feedback; Phase 1). Not everyone
  comes home with one — some builds start without (the first barrier), some with one and
  a **monthly plan bill** they struggle to keep up. Can't cover it and the phone gets
  **shut off**. A new **"Get a phone"** action offers a cheap prepaid (a paid plan) or the
  real federal **Lifeline / ACP** subsidized program (a basic phone with *no* monthly
  bill). No hard gating yet — being without a phone is a cost and a disconnection, not a
  wall. Tunable; the fee is a starting number.
- **More interrupts (the unexpected, with real choices).** A second random beat now fires
  each run, independent of the life event — a **collision** (two things you need the same
  week; you can be one place, not both), a **windfall** (real money, fast, but on a
  deadline that eats your week), or an **old contact** (easy money that pays now and
  **schedules its own reckoning** a week or two out — a second-order ripple). From the
  reviewer's "more interruptions, with more choices, that pull us in different directions."
- **Home detention** (from lived-experience feedback) — a **first-class supervision
  status** with its own check-in and violation: a relentless **weekly monitoring fee**
  (often the most crippling cost of being watched at home) plus a **restricted week** (a
  standing day you can't freely use; the turn header attributes it). **Dana's** supervision
  *is* home detention — she reads as "on home detention" everywhere (card, situation panel,
  the "due this week" check-in), not probation (people are often on one or the other, or
  home detention first) — with the monitoring fee in place of the old probation fees.
  Tunable; the fee is a starting number.
- **Surprise home visit.** A new interrupt for any build on paper: your officer shows up
  unannounced for a compliance check, scheduled once per run at a turn you can't predict.
  How you meet it (cooperate, or freeze) nudges your standing. Recoverable, never a fail
  screen.
- **A car is now its own step.** A reinstated driver's **license** is permission to drive
  (a modest mobility bump), not a vehicle — it no longer reads as "a car" in your
  situation. The license gates a new **"Get a car of your own"** event, where you buy a
  cheap beater or arrange to regularly borrow a friend or family member's — that's what
  actually opens the week up (`has_car`, the top of the transport ladder). A license
  alone still leaves the bike and bus pass on the table; only a car retires them.

### Fixed
- **The job chain fits the character.** The web-dev onboarding event ("The dev gig the
  program referred") showed to *every* ID-holder — so e.g. Tasha (a CNA who never did a
  dev program) kept getting a dev job she could never onboard, with prose about a program
  she never attended. It's now scoped to web-dev cert holders, and everyone else gets a
  generic **"Land steady work"** path (a real, waged job — warehouse, kitchen, care work).
- **About count** — the in-app About screen still read "six hand-built people"; it's now
  **nine** (the v1.3.0 doc pass updated `docs/ABOUT.md` but missed the React screen).
- **Situation panel — "Papers & assets"** now matches the rest of the panel (a labeled
  row with its own heading and divider, instead of a stray line), and it distinguishes
  what you **hold** from what's **in the mail** — a birth certificate that's been ordered
  but hasn't arrived now reads as "in the mail" rather than simply absent.
- **A job now pays a weekly wage.** Landing a job set a flag but produced *no* recurring
  income — and it retired day labor — so getting hired actually left you poorer. A real
  job now deposits a weekly paycheck (`WEEKLY_WAGE`), and "skip it and take whatever pays"
  is a one-week **gig** (cash now, no lock-in) rather than a permanent no-pay job, so it
  no longer closes off day labor *or* the real role. The wage lands only after the ID, so
  the deliberately tight early-game money gate is untouched. *(Starting number; to be
  balanced with the seed harness and a playtest, per the reviewer feedback.)*

## [1.3.0] - 2026-06-22

The biggest content release yet: three new character builds (nine total) — including a
reunifying-parent **custody arc** — **random life events** that cut both ways, housing &
transport **ladders**, a redesigned character-select with **avatars**, plus a clearer
document chain and accessibility wins.

### Added
- **Three new character builds**, bringing the roster to nine: **Jaylen** (a young
  first-timer, walled by inexperience rather than a record), **Gloria** (the "has it all"
  contrast build — a job, savings, and support all intact, to show how much the deck
  matters), and **Tasha** (a parent fighting to regain custody). Tasha's build carries a
  **custody arc** — supervised visits each week and a mid-game **hearing** whose
  "make your case" option stays locked until you've built the stability family court
  demands (a real roof, income, a clean record), so the whole run becomes the case.
- **Random life events.** Every run now schedules one unexpected "life happens" beat at
  a seed-varied mid-game week, drawn from a pool that cuts both ways — a **loss** (a
  death in your support circle, a sudden health setback) or a **blessing** (an old
  friend turns up; an act of unearned kindness). You never know which is coming, the way
  reentry actually goes. It's rolled from a salted seed, so it's fully reproducible
  (classroom codes still match) and the losses branch and recover — never a fail screen.

### Changed
- **Character select, redesigned.** Each build now has a circle **avatar** (a deliberate
  mix of genders and skin tones) and a **unique** at-a-glance tag (no more three builds
  reading "has people in their corner"). The roster is now a compact list that **expands
  on tap** to reveal the build, pick a mode, and a **"Play [name]"** button that starts
  the run — with a hint up top so it's clear you tap a person, then Play. The in-game
  "your situation" button wears the character's avatar to match.

### Fixed
- **The event drawer's grab-handle closes it.** The little tab atop the slide-up sheet
  was decorative; tapping it now dismisses the drawer (like tapping the backdrop).
- **Getting around now scales like housing.** "Get a bike" kept reappearing after you
  already had one (it only checked the transportation pool). Wheels now form a ladder —
  bike < transit pass < car — gated by flags, so each option only shows when it's a real
  step up and retires once you have it or anything better. Builds now also start on the
  ladder: the getting-around they come home with (Marcus's bike, Gloria's car) is set at
  creation, so they're never offered wheels they already own.
- **Locked event choices are announced to screen readers.** The locked move and its
  reason — the catch-22, the core teaching moment — used the native `disabled` attribute,
  which dropped it from the accessibility tree. It's now `aria-disabled` with the reason
  described (and the click guarded), so the wall is announced, not just drawn.
- **The state-ID step reads as a document chain.** The "Getting your state ID" prompt now
  makes clear the ID needs a **birth certificate** (a different document) and proof of
  address first — and once a cert is in the mail, the hub goes quiet instead of
  re-offering a dead-end DMV trip, returning when the cert arrives.

## [1.2.2] - 2026-06-21

A gameplay fix: housing now climbs a ladder instead of looping back on itself.

### Fixed
- **Housing now moves only up a ladder.** Once you reached transitional housing, the
  game kept offering (and let you re-pick) transitional housing. Housing states now
  have a rank (none < shelter < couch < transitional < rental < stable), kept in sync
  with the track, so each housing rung only appears when it's an upgrade and retires
  once you've climbed past it. The "look for your own place" event split into a
  **transitional** rung and an **own-place / rental** rung, each gated on the ladder.

## [1.2.1] - 2026-06-21

UX & accessibility polish from a playtest review: clearer outcome and debrief screens,
screen-reader labels on the cards, an honest housing label, and a clearer day budget.

### Added
- **Card accessibility** — action, obligation, and "interrupt" cards now carry explicit
  screen-reader labels (title + tags + day cost) for cleaner announcements.
- **Days-left clarity** — the turn header now labels the day dots ("Days left this
  week") and explains a short week (e.g. "1 day a week already goes to mandated
  treatment").

### Changed
- Outcome screens no longer repeat the full event prompt, so the result and **Continue**
  sit higher on small screens.
- Character-select cards humanize the housing line (e.g. "with family/a friend" instead
  of the raw `couch`), so it no longer contradicts a build's story (Renae's spare room).

### Fixed
- Debrief "footing" wording no longer reads "holding steady" on a slight decline — the
  word tracks the change, and the line notes footing is the average of the five pools.

## [1.2.0] - 2026-06-21

A sixth build, deeper content on the thinnest tracks, clearer in-game feedback, and a
check-in fix: the unsupervised "max-out" archetype, transportation/housing events, a
live character "situation" panel, pool bars that show what changed, and a
parole/probation check-in you can skip again.

### Added
- **New archetype — Cal, an unsupervised "max-out" build.** Released after serving
  the full sentence: no parole or probation (and so no check-ins, fees, or slot tax —
  a full week), but isolated and unsupported, in a shelter with nothing. The first
  build that isn't on paper; teaches that "no supervision" means "no scaffolding,"
  not "easier." Pure origin data — no engine changes.
- **Transportation & housing content** — three new events: restore a suspended
  license (clears the unpaid-fines trap), get a community/used bike, and recovery /
  sober-living housing. Fills the thinnest tracks (transportation went from one event
  to three); 28 events total.
- **"Your situation" panel** — a 👤 button in the turn header opens a live read of
  the character's current standing: housing, work, supervision (with parole/probation
  good-standing / warned / violation-pending), ties, how they get around, and the
  papers/assets they're carrying. The shareable run code moved here from the ⓘ "How
  to play" card, which now holds gameplay info + the help link.

### Changed
- **Pool bars now show what moved.** When you tap **Continue** after an outcome, the
  screen scrolls to the pools and each changed bar pulses and shows its delta (`+10`,
  `−6`) — so the change is always seen, instead of flickering behind the dimmed sheet
  (or off-screen when the choice was picked from the bottom of a long list). The pool
  update is deferred to Continue for this. Reduced-motion-aware: the number still
  shows; only the animation is gated.

### Fixed
- **You can skip a parole/probation check-in again.** Its "reschedule" branch
  redundantly re-scheduled the check-in as a *forced* incident, which blocked ending
  the week. The check-in already recurs weekly on its own, and a missed one already
  files a violation — so it's back to a normal, skippable obligation: forget it and
  take the technical violation, as intended.

## [1.1.0] - 2026-06-21

Reentry resources, surfaced in the end-of-run debrief **and** an always-available
"Where to get help" screen — plus an in-app update prompt and post-1.0.0 hardening.

### Added
- **Reentry resource directory** — surfaces a verified national baseline of free
  resources (National Reentry Resource Center, 988, SAMHSA, 211, CareerOneStop,
  Benefits.gov, HRSA, LawHelp), with a documented hook for sites to add their own
  local listings in `content/resources.yaml`.
- **Always-available "Where to get help" screen** — the resource directory is now
  reachable from the landing page, the in-game info (ⓘ) card, and About — not only the
  end-of-run debrief — so help never requires finishing, or even starting, a run.
- **In-app update prompt** — when a new build is deployed, a small "new version —
  Refresh" banner appears and applies it on tap (`registerType: "prompt"`), instead of
  silently reloading an open tab and interrupting a run.
- Screenshots in the README.

### Fixed
- Resource contact line could overflow on mobile for a long URL (e.g. CareerOneStop):
  it now shows the host (not the full path) and wraps instead of bleeding off-screen.

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

[Unreleased]: https://github.com/brett-buskirk/day-one/compare/v1.3.0...HEAD
[1.3.0]: https://github.com/brett-buskirk/day-one/compare/v1.2.2...v1.3.0
[1.2.2]: https://github.com/brett-buskirk/day-one/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/brett-buskirk/day-one/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/brett-buskirk/day-one/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/brett-buskirk/day-one/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/brett-buskirk/day-one/releases/tag/v1.0.0

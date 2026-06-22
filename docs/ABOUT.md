# Day One — what it is, and why

*A plain-language tour. No technical background needed.*

---

## The short version

**Day One is a simulator about coming home from prison.** You step into the life of
someone recently released and live their first ninety days — one week at a time —
trying to get an ID, a place to stay, a job, and some footing, while the clock,
the money, and the goodwill of the people around you all run short.

It plays a little like *Oregon Trail* or the *Spent* poverty simulator: no flashy
graphics, just decisions that matter. It runs in a web browser, installs onto a
phone like an app, and works with no internet connection — because the people it's
built for often have an old phone and a spotty signal long before they have a
laptop.

---

## Why it exists

Most people picture release as the hard part being over. In reality, the first
ninety days are a maze of small, stacked obstacles — and one missing piece can
block all the others. You can't get a job without an ID. You can't get the ID
without a birth certificate and proof of where you live. You can't easily prove
where you live when you're on someone's couch. Meanwhile rent is due, a parole
officer expects you across town, and every errand eats a day you didn't have.

Day One was built for **two groups of people, equally:**

- **People preparing to come home.** A safe place to rehearse those decisions, set
  realistic expectations, and build a plan — *before* the stakes are real. The
  promise here is: *this is practice, not a prediction, and there is always a way
  forward.*
- **Everyone else** — staff, volunteers, family, the public. A way to *feel*, not
  just be told, what reentry actually demands. The promise here is: *feel the wall.*

Both groups play the exact same game; only the framing and difficulty change.

Day One is **built by a returning citizen, for returning citizens.** The barriers in
it aren't imagined — they're remembered.

---

## How you play

- **A week is a turn.** Each week you get a handful of "days" to spend, and there's
  always more that needs doing than days to do it. *This week I can hit the DMV, or
  the benefits office, or pick up work — not all three.* That squeeze is the point.
- **Five things you're juggling:** money, morale, your support network, how easily
  you can get around, and your health. They rise and fall, and they trade off — the
  desperate move usually costs you something somewhere else.
- **You can see the wall before you can climb it.** The right next step often shows
  up right on screen, but greyed out, with the reason: *needs a birth certificate.*
  That gap — seeing the move you can't make yet — *is* the simulation.
- **Setbacks, not "game over."** Run out of money and you don't lose; you get a
  crisis with hard choices (borrow, apply for aid, go without). The game never shows
  a "you failed" screen. It's about the *trajectory* — are things trending up? — and
  the quality of your decisions under pressure, not just where day ninety leaves you.
- **It ends in a debrief, not a score.** At day ninety you get an honest picture of
  where things landed and a week-by-week replay of *how* you got there — the part
  you can actually learn from.

You choose **who** to play and **why** you're here. There are nine hand-built
people, ranging from gentle to brutal — someone with real skills but no documents;
someone whose family showed up, to show what support changes; someone carrying the
weight of probation (fees, court dates, mandated hours); someone with a registry
requirement that makes housing and work near-impossible; a "longtimer" home after
two decades, facing a technology gap and the mental-health weight of all those
years; someone who "maxed out" — released with no supervision at all, and so no
officer, no programs, and no one pointing the way; a young first-timer whose wall is
inexperience rather than a record; a parent bending every week toward a custody
hearing to get her daughter back; and — for contrast — someone who came home to
everything intact (a job, savings, support), to show how much the starting deck
matters. There's also a **"Surprise
me"** option that generates a fresh,
coherent person for you. And you pick a framing: **Training** (practice, always a
way forward) or **Empathy** (feel the wall — the deep end). Throughout, the system
models *barriers and consequences, never moral judgment.*

### Playing it with a group (classroom mode)

Because the whole game is reproducible (see below), a facilitator can run it with a
room. Every run is fully decided by three things — **who, which framing, and a
"seed" number** — so the app turns those into a tiny shareable code like
`marcus.training.482913`. Hand that one code to a group, everyone types it in, and
they all get the **identical** run: the same character, the same situations, the
same luck. The *only* thing that differs is the choices each person makes — which is
exactly what you then compare in the debrief. ("You got the ID by week nine; I never
did — what did you do differently?") The code shows up on the start screen, on the
in-game "Your situation" panel (the 👤 button), and on the debrief, so a run can be
shared before, during, or after. (For handing someone a half-finished run to
*continue*, there's also a full
"export this run" file.)

---

## What's going on under the hood (the interesting part)

You don't need to know any of this to play — but it's where the real craft is.

**The "rules" and the "world" are kept completely separate.** Think of a board
game: there's the rule book, and there are the scenario cards. Day One is built the
same way:

- **The world** is a stack of plain, human-readable files — each situation (a trip
  to the DMV, a rent crisis, a parole check-in) written out as data, including its
  choices and what each choice costs or unlocks. A person with deep reentry
  expertise and *no coding ability* can write a new scenario by copying an existing
  file and editing the words. Before anything ships, an automatic check makes sure
  every scenario is well-formed and refers only to things that actually exist — if
  someone makes a typo, the build stops and says so, loudly.

- **The engine** is the rule book: a small, self-contained brain that knows how to
  run a week, weigh the odds of an outcome, apply the consequences, and tally the
  ending. It contains no art and no buttons — just the logic — which is what keeps
  it trustworthy and testable. Dozens of automated tests check that the rules behave
  exactly as intended, including playing entire 90-day runs start to finish.

Two design choices in that engine are quietly powerful:

- **It's reproducible.** Every run is driven by a "seed" number, so the same
  character + framing + seed always produces the exact same run — the same
  situations *and* the same luck. That's what makes the classroom code above work,
  and it makes the rules reliably testable. It even lets the game **generate a whole
  random character from a seed** that's still perfectly reproducible for everyone.
- **A run is portable.** Any run can be saved out — as the tiny setup code, or as a
  full file capturing every choice — and handed to someone else to play, continue,
  or replay. Close the tab on the bus and resume later.

**The app itself** is deliberately lightweight. It's a web app that installs to a
phone's home screen, runs offline once loaded, and is built to be gentle on an old
Android device and a metered data plan. It's designed mobile-first and for
accessibility — large touch targets, legible text, screen-reader friendly, and a
light or dark theme — because the audience makes those requirements, not niceties.

---

## The principles that guide every decision

If a design choice ever conflicts with one of these, these win:

1. **Setbacks, not game-overs.** Consequence comes from attrition and hard
   trade-offs, not a failure screen. A hard build can end precarious through no bad
   play — and that's honest, not a loss.
2. **Barriers are real and concrete.** Every obstacle is enforced by the rules, not
   just described in the story. You can see the locked door.
3. **The arc emerges; it isn't scripted.** Situations are authored; the *story* is
   whatever your choices write.
4. **Two audiences, one engine.** Practice and empathy run on the same machine.
5. **Built for the real world it depicts.** A phone, offline, on a bad connection,
   for people who've been handed enough that doesn't work.

---

*Want the deeper version? `docs/DESIGN.md` is the full design specification, and the
project [`README.md`](../README.md) covers how to run it.*

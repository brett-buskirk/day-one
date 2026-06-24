# Voice note → Claude Code template

A custom [Plaud](https://www.plaud.ai/) template that turns a raw, rambling **voice note**
about this project into a clean, structured brief you can hand straight to **Claude Code**
(the AI coding agent that works in this repo).

The loop: talk an idea, bug, or playtest reaction into Plaud → its AI reshapes the
transcript through [`voice-note-template.md`](voice-note-template.md) → paste the result
into Claude Code → it reviews or builds. A two-minute ramble comes out the other side as a
tidy brief: a title, a one-line summary, the specifics, what "done" looks like, and any open
questions.

## Make your own

The most useful trick: **let the agent write the template for you.** Claude Code already
lives in the repo — it knows the architecture, the conventions, and (crucially) what
information it needs from you to actually act. So instead of describing your project to
another AI by hand, ask Claude Code to draft its own intake template. The version here was
written exactly that way.

The shape that works, whatever your project:

- **Role + project context** — who the agent is, and the few facts that frame any note correctly.
- **Classify** — sort each thought into a type (bug, feature, content, balance, tooling, question).
- **Pull the specifics** — which file, character, number, or repro steps; and the real-world *why*.
- **Desired outcome** — what "done" looks like, with an acceptance check where possible.
- **Path** — quick action, measure-then-tune, or discuss-first; plus any open questions.

See [`voice-note-template.md`](voice-note-template.md) for the full Day One version you can adapt.

# Contributing to Day One

Thanks for helping. Day One is a phone-first reentry simulator; see
[`docs/ABOUT.md`](docs/ABOUT.md) for what it is and [`docs/DESIGN.md`](docs/DESIGN.md)
for the design source of truth. [`CLAUDE.md`](CLAUDE.md) is the fast orientation for
working in the codebase.

## Workflow

`main` is protected and is what auto-deploys to production, so:

1. **Branch off `main`** — use a short, descriptive name, e.g. `feat/clinic-events`,
   `fix/parole-copy`, `chore/deps`.
2. **Make your change**, keeping it green locally:
   ```bash
   npm run typecheck && npm test && npm run build
   ```
3. **Open a pull request** into `main`. **CI** (content validation + typecheck +
   tests + build) must pass before it can merge.
4. **Merge** once CI is green (and any requested review is approved). Merging to
   `main` deploys automatically.

Keep PRs focused and the commit history readable. Don't commit
`src/content/corpus.generated.json` (it's generated).

## Adding content (the most common change)

No coding needed for new situations or characters — it's authored data:

- **An event:** copy a file in `content/events/`, edit the prose / choices /
  effects, and keep the `id` matching the filename (`evt_[a-z0-9_]+`). Register any
  new flags in `src/engine/flags.json`. Run `npm run build:content` — it fails
  loudly on mistakes.
- **A character:** add an origin in `content/characters/` and its id to
  `ARCHETYPE_ORDER` in `src/content/corpus.ts`. Author difficulty in the origin
  data, not in code.

See [`CLAUDE.md`](CLAUDE.md) for the predicate grammar, effect verbs, and the
engine's non-negotiables (engine purity, determinism/serialization, barriers-as-data,
no "you lost" screen).

## Principles

Day One models **barriers and consequences, never moral judgment**, and uses
**person-first language** throughout. Please keep both in any prose you add.

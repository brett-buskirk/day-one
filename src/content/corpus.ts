// Typed access to the compiled corpus. corpus.generated.json is produced by the
// content pipeline (scripts/compile-content.mjs) at dev/build start and is
// precached by the service worker, so the whole world is available offline.

import data from "./corpus.generated.json";
import type { Corpus, CharacterOrigin } from "../engine/types";

export const corpus = data as unknown as Corpus;

export const MARCUS_ID = "marcus";

// Archetypes offered on the start screen, in a deliberate order of escalating
// difficulty: the thesis build, a supported contrast, a probation build, the
// registry deep-end, the longtimer (deepest end — empathy), and the unsupervised
// "max-out" (no supervision, and no scaffolding to go with it).
const ARCHETYPE_ORDER = ["marcus", "renae", "dana", "theo", "ray", "cal"];

export const archetypes: CharacterOrigin[] = ARCHETYPE_ORDER.map(
  (id) => corpus.characters[id]
).filter(Boolean);


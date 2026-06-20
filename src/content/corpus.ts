// Typed access to the compiled corpus. corpus.generated.json is produced by the
// content pipeline (scripts/compile-content.mjs) at dev/build start and is
// precached by the service worker, so the whole world is available offline.

import data from "./corpus.generated.json";
import type { Corpus, CharacterOrigin } from "../engine/types";

export const corpus = data as unknown as Corpus;

export const MARCUS_ID = "marcus";

// Archetypes offered on the start screen, in a deliberate order: the thesis
// build, then a supported contrast, then the registry deep-end (empathy).
const ARCHETYPE_ORDER = ["marcus", "renae", "theo"];

export const archetypes: CharacterOrigin[] = ARCHETYPE_ORDER.map(
  (id) => corpus.characters[id]
).filter(Boolean);


// Typed access to the compiled corpus. corpus.generated.json is produced by the
// content pipeline (scripts/compile-content.mjs) at dev/build start and is
// precached by the service worker, so the whole world is available offline.

import data from "./corpus.generated.json";
import type { Corpus } from "../engine/types";

export const corpus = data as unknown as Corpus;

export const MARCUS_ID = "marcus";

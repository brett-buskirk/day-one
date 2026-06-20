// Flag registry — the canonical list of known flags (docs/DESIGN.md §7).
//
// Single source of truth lives in flags.json so the Node content build
// (scripts/compile-content.mjs) and the app share exactly one list. The build
// fails on any content reference to a flag that is neither in this registry nor
// a generated unlock flag (see UNLOCK_FLAG_RE).

import registry from "./flags.json";

export const FLAG_REGISTRY: readonly string[] = registry.flags;

// Flags the engine generates at runtime from an outcome's `unlocks` array
// (DESIGN §9: "the engine may set an <id>_unlocked flag"). These are valid
// without appearing in the registry.
export const UNLOCK_FLAG_RE = /^evt_[a-z0-9_]+_unlocked$/;

export function isKnownFlag(name: string): boolean {
  return FLAG_REGISTRY.includes(name) || UNLOCK_FLAG_RE.test(name);
}

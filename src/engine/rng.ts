// Deterministic, seedable PRNG (mulberry32). DESIGN §13: "All randomness flows
// through a single seedable PRNG stored in game state. Same seed + same inputs
// ⇒ same run." This makes the engine unit-testable and enables the "everyone
// plays the same character, compare outcomes" classroom mode for free.
//
// Pure by construction: `next` takes the current 32-bit state and returns the
// next float in [0, 1) together with the advanced state. The caller threads the
// state through GameState.rngState — nothing here mutates global state.

export interface Roll {
  value: number; // in [0, 1)
  state: number; // advanced PRNG state, store back into GameState.rngState
}

export function next(state: number): Roll {
  let a = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, state: a };
}

// Normalize an arbitrary seed (e.g. Date.now(), a typed-in number) into a
// 32-bit integer suitable as an initial PRNG state.
export function seedToState(seed: number): number {
  return Math.floor(seed) | 0;
}

// Generate a fresh seed for a new run. Kept out of the engine's pure path so
// determinism is never accidentally broken — call this only at run creation.
export function randomSeed(): number {
  return (Math.floor(Math.random() * 0xffffffff) >>> 0) || 1;
}

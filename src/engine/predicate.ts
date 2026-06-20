// Safe predicate evaluator for `conditions` and `requires` (DESIGN §9).
//
// A predicate is a single comparison "<path> <op> <value>"; a list is AND-ed.
// No inline boolean operators, no eval(). Unknown flags read as false.
//
//   path:  flags.X | pools.X | tracks.X.status | tracks.X.readiness
//          | turn | mode | config.X
//   op:    == != >= <= > <
//   value: true | false | a number | a quoted string

import type { GameState, Predicate } from "./types";

// Order matters: two-char operators before their one-char prefixes.
const OPS = ["==", "!=", ">=", "<=", ">", "<"] as const;
type Op = (typeof OPS)[number];

type Value = string | number | boolean;

interface Parsed {
  path: string;
  op: Op;
  value: Value;
}

function parseValue(raw: string): Value {
  const s = raw.trim();
  if (s === "true") return true;
  if (s === "false") return false;
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    return s.slice(1, -1);
  }
  const n = Number(s);
  if (!Number.isNaN(n) && s !== "") return n;
  // Bare word: treat as a string (e.g. an unquoted status). Tolerant by design.
  return s;
}

export function parsePredicate(pred: Predicate): Parsed {
  for (const op of OPS) {
    const i = pred.indexOf(op);
    if (i === -1) continue;
    // Avoid matching the "=" inside ">=" / "<=" / "==" / "!=" as a lone op:
    // because OPS lists the two-char forms first, the first hit is correct.
    const path = pred.slice(0, i).trim();
    const value = parseValue(pred.slice(i + op.length));
    if (path) return { path, op, value };
  }
  throw new Error(`Unparseable predicate: "${pred}"`);
}

// Resolve a path against state. Returns `false` for unknown flags and
// `undefined` for genuinely unknown paths (which then fail comparison safely).
function resolvePath(state: GameState, path: string): Value | undefined {
  if (path === "turn") return state.turn;
  if (path === "mode") return state.mode;

  const dot = path.indexOf(".");
  if (dot === -1) return undefined;
  const head = path.slice(0, dot);
  const rest = path.slice(dot + 1);

  switch (head) {
    case "flags":
      return state.flags[rest] ?? false; // unknown flag → false (DESIGN §9)
    case "pools":
      return (state.pools as Record<string, number>)[rest];
    case "config":
      return (state.config as unknown as Record<string, Value>)[rest];
    case "tracks": {
      const [track, field] = rest.split(".");
      const t = (state.tracks as Record<string, { status: string; readiness?: number }>)[track];
      if (!t) return undefined;
      if (field === "status") return t.status;
      if (field === "readiness") return t.readiness ?? 0;
      return undefined;
    }
    default:
      return undefined;
  }
}

function compare(left: Value | undefined, op: Op, right: Value): boolean {
  switch (op) {
    case "==":
      return left === right;
    case "!=":
      return left !== right;
  }
  // Ordering operators are numeric only.
  const l = Number(left);
  const r = Number(right);
  if (Number.isNaN(l) || Number.isNaN(r)) return false;
  switch (op) {
    case ">=":
      return l >= r;
    case "<=":
      return l <= r;
    case ">":
      return l > r;
    case "<":
      return l < r;
  }
}

export function evalPredicate(state: GameState, pred: Predicate): boolean {
  const { path, op, value } = parsePredicate(pred);
  return compare(resolvePath(state, path), op, value);
}

// AND semantics: every predicate must pass. An empty/undefined list passes.
export function evalAll(state: GameState, preds?: Predicate[]): boolean {
  if (!preds || preds.length === 0) return true;
  return preds.every((p) => evalPredicate(state, p));
}

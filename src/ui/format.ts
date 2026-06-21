// Presentation helpers: pool labels and turning machine-readable predicates and
// costs into legible, human text for the choice UI (so a locked choice explains
// itself — the catch-22 the player can read).

import { parsePredicate } from "../engine";
import type { PoolKey, Predicate } from "../engine";

export const POOL_META: { key: PoolKey; label: string; hint: string }[] = [
  { key: "money", label: "Money", hint: "Cash on hand" },
  { key: "morale", label: "Morale", hint: "Hope and momentum" },
  { key: "social_capital", label: "Support", hint: "Network you can lean on" },
  { key: "transportation", label: "Transport", hint: "Getting around" },
  { key: "health", label: "Health", hint: "Body and recovery" },
];

const FLAG_LABELS: Record<string, string> = {
  has_state_id: "a state ID",
  has_birth_cert: "a birth certificate",
  has_proof_of_address: "proof of address",
  has_ssn_card: "an SSN card",
  has_bank_account: "a bank account",
  has_cert_webdev: "the web-dev certificate",
  has_job: "a job",
  birth_cert_ordered: "the birth cert ordered",
  knows_id_requirements: "the ID requirements",
  in_recovery_support: "recovery support",
};

function prettyFlag(name: string): string {
  if (FLAG_LABELS[name]) return FLAG_LABELS[name];
  return name.replace(/^has_/, "").replace(/_/g, " ");
}

function prettyPool(name: string): string {
  return POOL_META.find((p) => p.key === name)?.label ?? name;
}

// Credentials are authored as ids (e.g. "cert_webdev"); show players prose.
const CREDENTIAL_LABELS: Record<string, string> = {
  cert_webdev: "Web development certificate",
};

export function humanizeCredential(id: string): string {
  if (CREDENTIAL_LABELS[id]) return CREDENTIAL_LABELS[id];
  return id
    .replace(/^cert_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Resource categories are authored as ids (e.g. "legal_aid"). The debrief tag
// uppercases them via CSS, so just turn underscores into spaces ("legal aid").
export function humanizeCategory(id: string): string {
  return id.replace(/_/g, " ");
}

// Turn a single `requires` predicate into a short phrase for a locked choice.
export function humanizeRequirement(pred: Predicate): string {
  try {
    const { path, op, value } = parsePredicate(pred);
    if (path.startsWith("flags.")) {
      const flag = path.slice("flags.".length);
      const want = value === true;
      return want ? `Need ${prettyFlag(flag)}` : `Only without ${prettyFlag(flag)}`;
    }
    if (path.startsWith("pools.")) {
      const pool = path.slice("pools.".length);
      return `Need ${prettyPool(pool)} ${op} ${value}`;
    }
    if (path.startsWith("tracks.")) {
      const [, track] = path.split(".");
      if (op === "!=") return `Need ${track} other than “${value}”`;
      return `Need ${track} “${value}”`;
    }
    return `${path} ${op} ${value}`;
  } catch {
    return pred;
  }
}

export function slotsLabel(n: number): string {
  return n === 1 ? "1 day" : `${n} days`;
}

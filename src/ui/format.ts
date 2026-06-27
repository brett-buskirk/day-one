// Presentation helpers: pool labels and turning machine-readable predicates and
// costs into legible, human text for the choice UI (so a locked choice explains
// itself — the catch-22 the player can read).

import { parsePredicate, transportFactor } from "../engine";
import type { PoolKey, Predicate } from "../engine";

// Per-character presentation: a circle avatar (emoji — a deliberate mix of genders
// and skin tones) and a UNIQUE at-a-glance tag, so every build on the select screen
// reads distinctly. Random / generated builds fall back to a derived tag.
const CHARACTER_FACE: Record<string, { avatar: string; tag: string }> = {
  marcus: { avatar: "👨🏿", tag: "Skills, walled off" },
  renae: { avatar: "👩🏽", tag: "Family in her corner" },
  dana: { avatar: "👩🏼", tag: "Home detention — bled by fees" },
  theo: { avatar: "👨🏻", tag: "Registry — the deepest end" },
  ray: { avatar: "👴🏼", tag: "24 years in — the longtimer" },
  cal: { avatar: "👨🏽", tag: "Maxed out — no safety net" },
  jaylen: { avatar: "👨🏾", tag: "Young, green, first time" },
  tasha: { avatar: "👩🏿", tag: "Fighting for her daughter" },
  gloria: { avatar: "👩🏻", tag: "Came home to everything" },
  hector: { avatar: "🧔🏽", tag: "The war came home with him" },
};
export const avatarFor = (id: string): string => CHARACTER_FACE[id]?.avatar ?? "🧑";
export const tagForId = (id: string): string | null => CHARACTER_FACE[id]?.tag ?? null;
// A soft, stable per-character tint for the avatar circle.
export function avatarStyle(id: string) {
  const hue = [...id].reduce((a, ch) => a + ch.charCodeAt(0), 0) % 360;
  return { backgroundColor: `hsl(${hue} 55% 85%)` };
}

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
  has_laptop: "a laptop",
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
  cert_cna: "Certified nursing assistant (CNA)",
  cert_medassist: "Medical assistant certificate",
  cert_hvac: "HVAC certificate",
  cert_culinary: "Culinary certificate",
  cert_forklift: "Forklift certification",
  cert_paralegal: "Paralegal certificate",
  ged: "GED",
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

// A long URL's path overflows the contact line on mobile; show just the host
// (e.g. "careeronestop.org") while the link itself still points at the full URL.
export function shortUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  }
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

// ---- Character "situation" labels (the in-game status panel) ----

const HOUSING_LABELS: Record<string, string> = {
  none: "On the street",
  shelter: "In a shelter",
  couch: "Staying with family or a friend",
  transitional: "Transitional housing",
  halfway_house: "A halfway house",
  rental: "Renting a place",
  stable: "Stable housing",
};

// A compact version of the "night one" housing for the character-select cards —
// "couch" reads as "with family/a friend" so it doesn't contradict a build whose
// story is a spare bedroom (e.g. Renae), only a literal couch.
const NIGHT_ONE_SHORT: Record<string, string> = {
  none: "no fixed place",
  shelter: "a shelter",
  couch: "with family/a friend",
  transitional: "transitional housing",
  halfway_house: "a halfway house",
  rental: "a rented room",
  stable: "stable housing",
};
export const nightOneShort = (s: string): string => NIGHT_ONE_SHORT[s] ?? s;
const WORK_LABELS: Record<string, string> = {
  unemployed: "Out of work",
  searching: "Job searching",
  leads: "Chasing leads",
  interviewing: "Interviewing",
  offer: "Got an offer",
  employed: "Working",
};
const LEGAL_LABELS: Record<string, string> = {
  parole: "On parole",
  probation: "On probation",
  home_detention: "On home detention",
  unsupervised: "No supervision",
};
const RELATIONSHIP_LABELS: Record<string, string> = {
  isolated: "On your own",
  strained: "Strained ties",
  one_tie: "One person in your corner",
  supported: "Some support",
  network: "A real network",
};

export const housingLabel = (s: string): string => HOUSING_LABELS[s] ?? s;
export const workLabel = (s: string): string => WORK_LABELS[s] ?? s;
export const supervisionLabel = (s: string): string => LEGAL_LABELS[s] ?? s;
export const relationshipsLabel = (s: string): string => RELATIONSHIP_LABELS[s] ?? s;

// How they get around. A car is a possession (has_car — owned or regularly borrowed),
// NOT just a high pool: a reinstated license is permission to drive, not a vehicle.
// Below that, the band comes from the transportation pool.
export function transportLabel(pool: number, flags: Record<string, boolean> = {}): string {
  if (flags.has_car) return "A car";
  if (pool >= 35) return "A bus pass / borrowed rides";
  if (pool >= 15) return "A bike";
  return "On foot";
}

// Attribute the transportation slot-tax (DESIGN §4; reviewer Area 1): turn the silent
// "this errand costs 2 days" into a stated reason the player can act on. Null when there's
// no tax (a car, ×1) — only a poor commute inflates errands.
export function travelTaxNote(transportation: number): string | null {
  if (transportFactor(transportation) <= 1) return null; // reliable transit — no tax
  return "On foot, every errand across town costs double (travel ×2) — a bus pass or car would ease the squeeze.";
}

// Documents and assets the character is currently carrying (the gated reentry keys).
const HELD_LABELS: Array<[string, string]> = [
  ["has_state_id", "a state ID"],
  ["has_birth_cert", "a birth certificate"],
  ["has_ssn_card", "an SSN card"],
  ["has_proof_of_address", "proof of address"],
  ["has_bank_account", "a bank account"],
  ["has_license", "a driver's license"],
  ["has_transit_pass", "a transit pass"],
  ["has_phone", "a phone"],
  ["has_laptop", "a laptop"],
  ["has_resume", "a résumé"],
];
export function heldThings(flags: Record<string, boolean>): string[] {
  return HELD_LABELS.filter(([flag]) => flags[flag]).map(([, label]) => label);
}

// Papers ordered but not yet in hand — surfaced separately so "in the mail" reads
// differently from "held" (e.g. a birth cert that's been ordered and is en route).
export function awaitingThings(flags: Record<string, boolean>): string[] {
  const out: string[] = [];
  if (flags.awaiting_birth_cert) out.push("a birth certificate");
  return out;
}

// Supervision standing from the legal track's readiness — mirrors the debrief's
// paroleDimension. Returns null when unsupervised (no standing to show).
export function standingLabel(legalStatus: string, readiness: number): string | null {
  if (legalStatus === "unsupervised") return null;
  if (readiness >= 50) return "good standing";
  if (readiness >= 20) return "warned";
  return "violation pending";
}

// Random character generation (DESIGN §8, §14: "a v2 replay feature").
//
// Produces a coherent, randomized CharacterOrigin that chargen turns into a run.
// Fully DETERMINISTIC from a seed — so a "random.<mode>.<seed>" scenario code
// reproduces the exact same person (and run) for an entire room. The generation
// RNG is a stream distinct from the run's RNG (different starting state), so the
// two never interfere.

import type { CharacterOrigin } from "./types";
import { next, seedToState } from "./rng";

export const RANDOM_ID = "random";

const NAMES = [
  "Andre", "Lena", "Maya", "Curtis", "Rosa", "Devon", "Tasha", "Hector", "Gloria",
  "Omar", "Priya", "Wesley", "Naomi", "Cesar", "Delia", "Trevor", "Bianca", "Malik",
  "Sondra", "Vance", "Iris", "Roy", "Carmen", "Elias",
];
const SKILLS = [
  "ged", "cert_hvac", "cert_culinary", "cert_webdev", "cert_forklift",
  "cert_paralegal", "cert_welding", "cert_cdl", "cert_barber",
];
const OFFENSE_CATS = ["drug_felony", "property_felony", "theft", "dui", "fraud", "violent", "registry"];

const SUPPORT_PHRASE: Record<string, string> = {
  isolated: "no one left in their corner",
  strained: "a frayed tie or two",
  one_tie: "one person still answering the phone",
  supported: "people who showed up",
  network: "a real network behind them",
};
const TONIGHT_PHRASE: Record<string, string> = {
  shelter: "a shelter bed",
  couch: "a borrowed couch",
  halfway_house: "a halfway house",
  transitional: "transitional housing",
  rental: "a rented room",
  none: "nowhere settled",
};

function buildSummary(o: CharacterOrigin): string {
  const sup =
    o.supervision.type === "none"
      ? "no supervision"
      : `${o.supervision.years ?? ""}-year ${o.supervision.type}`.trim();
  const support = SUPPORT_PHRASE[o.landing.support] ?? "an uncertain support";
  const tonight = TONIGHT_PHRASE[o.landing.night_one] ?? o.landing.night_one;
  const creds = o.person.credentials ?? [];
  const skills = creds.length
    ? `${creds.length} credential${creds.length > 1 ? "s" : ""} earned inside`
    : "no formal credentials";
  const reg = o.offense.registry_required
    ? " A registry requirement narrows where they're allowed to live and work."
    : "";
  return (
    `A randomly generated reentry: ${o.time_inside_years} years in, ${sup}, ` +
    `${tonight} tonight, ${support}, $${o.landing.gate_money} to start, ${skills}.${reg}`
  );
}

export function randomOrigin(seed: number): CharacterOrigin {
  // Distinct generation stream (≠ the run's rngState, which chargen seeds directly).
  let st = seedToState(seed ^ 0x9e3779b9) || 1;
  const rnd = () => {
    const r = next(st);
    st = r.state;
    return r.value;
  };
  const int = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
  const chance = (p: number) => rnd() < p;
  const sampleN = <T,>(arr: T[], n: number): T[] => {
    const pool = [...arr];
    const out: T[] = [];
    for (let i = 0; i < n && pool.length; i++) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
    return out;
  };

  const timeInside = int(1, 26);
  const long = timeInside >= 12;

  const category = pick(OFFENSE_CATS);
  const registry =
    category === "registry" || (category === "violent" && chance(0.5)) || (long && chance(0.15));

  const supervisionType = pick(["parole", "parole", "probation", "none"] as const);
  const conditions: string[] = [];
  if (supervisionType !== "none") {
    conditions.push("weekly_checkin");
    if (chance(0.5)) conditions.push("mandated_treatment");
    if (supervisionType === "probation" && chance(0.7)) conditions.push("supervision_fees");
    if (chance(0.3)) conditions.push("community_service");
    if (registry) conditions.push("registry_compliance");
    if (chance(0.3)) conditions.push("curfew");
  }

  const support = pick(
    registry || long
      ? ["isolated", "isolated", "strained", "one_tie"]
      : ["isolated", "strained", "one_tie", "supported"]
  );
  const transportation = pick([
    "none",
    "bike",
    "bike",
    "bus_pass",
    "car",
  ]) as CharacterOrigin["landing"]["transportation"];
  const nightOne = pick(
    registry
      ? ["shelter", "shelter", "halfway_house"]
      : ["couch", "couch", "shelter", "halfway_house", "transitional"]
  );

  const credentials = sampleN(SKILLS, int(0, long ? 3 : 2));
  const name = pick(NAMES);
  const displayAge = Math.min(72, int(19, 34) + timeInside);

  const origin: CharacterOrigin = {
    id: RANDOM_ID,
    name,
    display_age: displayAge,
    summary: "",
    time_inside_years: timeInside,
    supervision: {
      type: supervisionType,
      years: supervisionType === "none" ? undefined : int(1, 7),
      conditions,
    },
    landing: {
      night_one: nightOne,
      housing_clock_turns: int(2, 6),
      support,
      job_lined_up: chance(0.1),
      documents: chance(0.15) ? ["state_id"] : [],
      transportation,
      gate_money: int(0, 12) * 20,
    },
    person: {
      in_recovery: chance(0.4),
      chronic_health_issue: chance(long ? 0.6 : 0.3),
      mental_health_issue: chance(long ? 0.55 : 0.3),
      credentials,
    },
    offense: { category, registry_required: registry },
  };
  origin.summary = buildSummary(origin);
  return origin;
}

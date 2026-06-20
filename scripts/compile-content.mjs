// Day One — content pipeline (docs/DESIGN.md §12).
//
// Loads every YAML file under content/, validates each event against
// schema/event.schema.json with AJV, FAILS on invalid content or unknown flag
// references, and compiles the corpus to a JSON bundle the app imports.
//
// This module is shared by:
//   - scripts/build-content.mjs  (CLI: `npm run build:content`, CI)
//   - vite.config.ts             (runs it in buildStart + on content changes)
//
// It throws a ContentError on any failure; callers decide how to surface it.

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import Ajv2020 from "ajv/dist/2020.js";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export class ContentError extends Error {
  constructor(message) {
    super(message);
    this.name = "ContentError";
  }
}

const FLAG_REF_RE = /^flags\.([a-z0-9_]+)\b/;
const UNLOCK_FLAG_RE = /^evt_[a-z0-9_]+_unlocked$/;

function listYaml(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))
    .sort()
    .map((f) => join(dir, f));
}

function loadYaml(file) {
  try {
    return yaml.load(readFileSync(file, "utf8"));
  } catch (err) {
    throw new ContentError(`Failed to parse YAML ${file}:\n  ${err.message}`);
  }
}

// Collect every flag name an event references (predicates + effect writes), so
// the build can fail loudly on a typo'd flag instead of letting it read as a
// silent `false` at runtime (DESIGN §7).
function collectFlagRefs(event) {
  const refs = new Set();
  const fromPredicates = (preds) => {
    for (const p of preds ?? []) {
      const m = String(p).match(FLAG_REF_RE);
      if (m) refs.add(m[1]);
    }
  };
  fromPredicates(event.conditions);
  for (const choice of event.choices ?? []) {
    fromPredicates(choice.requires);
    for (const outcome of choice.outcomes ?? []) {
      for (const key of Object.keys(outcome.effects?.flags ?? {})) refs.add(key);
    }
  }
  return refs;
}

function isKnownFlag(name, registry) {
  return registry.includes(name) || UNLOCK_FLAG_RE.test(name);
}

/**
 * Compile and validate the content corpus.
 * @param {object} [opts]
 * @param {string} [opts.root]    repo root (defaults to this script's repo root)
 * @param {boolean} [opts.write]  write the JSON bundle to disk (default true)
 * @param {boolean} [opts.silent] suppress the success/warning log (default false)
 * @returns {{ corpus: object, warnings: string[], stats: object }}
 */
export function compileContent(opts = {}) {
  const root = opts.root ?? REPO_ROOT;
  const write = opts.write ?? true;
  const silent = opts.silent ?? false;

  const schemaPath = join(root, "schema", "event.schema.json");
  const registryPath = join(root, "src", "engine", "flags.json");
  const eventsDir = join(root, "content", "events");
  const charsDir = join(root, "content", "characters");
  const outFile = join(root, "src", "content", "corpus.generated.json");

  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  const registry = JSON.parse(readFileSync(registryPath, "utf8")).flags;

  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const validateEvent = ajv.compile(schema);

  const errors = [];
  const warnings = [];
  const events = {};
  const characters = {};

  // -- Events ---------------------------------------------------------------
  for (const file of listYaml(eventsDir)) {
    const event = loadYaml(file);
    const where = basename(file);

    if (!validateEvent(event)) {
      for (const e of validateEvent.errors ?? []) {
        errors.push(`${where}: ${e.instancePath || "/"} ${e.message}`);
      }
      continue;
    }
    if (events[event.id]) {
      errors.push(`${where}: duplicate event id "${event.id}"`);
      continue;
    }
    if (event.id !== basename(file).replace(/\.ya?ml$/, "")) {
      warnings.push(`${where}: id "${event.id}" does not match filename`);
    }

    // Fail on unknown flag references.
    for (const flag of collectFlagRefs(event)) {
      if (!isKnownFlag(flag, registry)) {
        errors.push(`${where}: references unknown flag "${flag}" (add it to src/engine/flags.json)`);
      }
    }

    events[event.id] = event;
  }

  // -- Characters (origins) -------------------------------------------------
  // No JSON Schema ships for origins yet; do a light structural check so a
  // malformed build still fails loudly rather than at runtime.
  for (const file of listYaml(charsDir)) {
    const origin = loadYaml(file);
    const where = basename(file);
    for (const field of ["id", "name", "landing", "supervision"]) {
      if (origin?.[field] === undefined) {
        errors.push(`${where}: origin missing required field "${field}"`);
      }
    }
    if (origin?.id) {
      if (characters[origin.id]) errors.push(`${where}: duplicate character id "${origin.id}"`);
      else characters[origin.id] = origin;
    }
  }

  // -- Referential warnings (dangling schedule/unlock targets) --------------
  const eventIds = new Set(Object.keys(events));
  for (const event of Object.values(events)) {
    for (const choice of event.choices ?? []) {
      for (const outcome of choice.outcomes ?? []) {
        const eff = outcome.effects ?? {};
        if (eff.schedule?.event && !eventIds.has(eff.schedule.event)) {
          warnings.push(`${event.id}: schedules unknown event "${eff.schedule.event}"`);
        }
        for (const u of eff.unlocks ?? []) {
          if (!eventIds.has(u)) warnings.push(`${event.id}: unlocks unknown event "${u}"`);
        }
      }
    }
  }

  if (errors.length) {
    throw new ContentError(
      `Content build failed with ${errors.length} error(s):\n` +
        errors.map((e) => `  ✗ ${e}`).join("\n")
    );
  }

  const corpus = {
    meta: {
      generated: "by scripts/compile-content.mjs — do not edit by hand",
      eventCount: Object.keys(events).length,
      characterCount: Object.keys(characters).length,
    },
    events,
    characters,
  };

  if (write) {
    mkdirSync(dirname(outFile), { recursive: true });
    writeFileSync(outFile, JSON.stringify(corpus, null, 2) + "\n", "utf8");
  }

  if (!silent) {
    for (const w of warnings) console.warn(`  ⚠ ${w}`);
    console.log(
      `✓ content: ${corpus.meta.eventCount} events, ${corpus.meta.characterCount} characters` +
        (write ? ` → ${outFile.replace(root + "/", "")}` : "")
    );
  }

  return { corpus, warnings, stats: corpus.meta };
}

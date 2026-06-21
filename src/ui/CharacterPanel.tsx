// The in-game "Your situation" panel: the character's current standing across the
// things that shift as you play (housing, work, supervision, ties, getting around),
// plus the papers/assets they're carrying and the shareable run code. Opened from
// the turn header. Reads entirely from current state, so it stays accurate mid-run.
import type { CharacterOrigin, GameState } from "../engine";
import { InfoModal } from "./InfoModal";
import { RunCodeShare } from "./RunCodeShare";
import {
  housingLabel,
  workLabel,
  supervisionLabel,
  relationshipsLabel,
  transportLabel,
  heldThings,
  standingLabel,
} from "./format";

interface Props {
  state: GameState;
  origin: CharacterOrigin | null;
  onClose: () => void;
}

export function CharacterPanel({ state, origin, onClose }: Props) {
  const title = origin ? `${origin.name}, ${origin.display_age}` : "Your situation";
  const held = heldThings(state.flags);
  const legal = state.tracks.legal;
  const standing = standingLabel(legal.status, legal.readiness ?? 0);
  const supervision = standing
    ? `${supervisionLabel(legal.status)} · ${standing}`
    : supervisionLabel(legal.status);
  const rows: Array<[string, string]> = [
    ["Housing", housingLabel(state.tracks.housing.status)],
    ["Work", workLabel(state.tracks.employment.status)],
    ["Supervision", supervision],
    ["People", relationshipsLabel(state.tracks.relationships.status)],
    ["Getting around", transportLabel(state.pools.transportation)],
  ];

  return (
    <InfoModal title={title} onClose={onClose}>
      <p className="muted small">Where things stand right now — this shifts as you play.</p>
      <dl className="origin-grid">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p className="muted small">
        <strong>Papers &amp; assets:</strong>{" "}
        {held.length > 0 ? held.join(", ") : "nothing yet — that's the first wall"}.
      </p>
      <RunCodeShare state={state} hint="Share this code so others play the identical run." />
    </InfoModal>
  );
}

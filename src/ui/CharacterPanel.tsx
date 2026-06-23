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
  awaitingThings,
  standingLabel,
  avatarFor,
  avatarStyle,
} from "./format";

interface Props {
  state: GameState;
  origin: CharacterOrigin | null;
  onClose: () => void;
}

export function CharacterPanel({ state, origin, onClose }: Props) {
  const title = origin ? `${origin.name}, ${origin.display_age}` : "Your situation";
  const held = heldThings(state.flags);
  const awaiting = awaitingThings(state.flags);
  const inHand = held.length
    ? held.join(", ")
    : awaiting.length
      ? "nothing in hand yet"
      : "nothing yet — that's the first wall";
  const papers = awaiting.length ? `${inHand} · in the mail: ${awaiting.join(", ")}` : inHand;
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
      {origin && (
        <div className="panel-avatar">
          <span className="avatar avatar-lg" style={avatarStyle(origin.id)} aria-hidden="true">
            {avatarFor(origin.id)}
          </span>
        </div>
      )}
      <p className="muted small">Where things stand right now — this shifts as you play.</p>
      <dl className="origin-grid">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
        <div className="origin-grid-full">
          <dt>Papers &amp; assets</dt>
          <dd>{papers}</dd>
        </div>
      </dl>
      <RunCodeShare state={state} hint="Share this code so others play the identical run." />
    </InfoModal>
  );
}

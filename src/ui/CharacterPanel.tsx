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
    ["Getting around", transportLabel(state.pools.transportation, state.flags)],
  ];
  if (origin?.person?.in_recovery) {
    rows.push(["Recovery", "In recovery — keeping clean time"]);
  }

  // The custody hearing's "make your case" gate (mirrors evt_custody_hearing.yaml,
  // scheduled week 9) — surfaced so her defining goal is legible, not a hidden catch-22.
  const reunifying = origin?.person?.reunifying === true;
  const custodyHousing = (state.tracks.housing.readiness ?? 0) >= 3;
  const custodyRecord = (state.tracks.legal.readiness ?? 0) >= 50;
  const custodyMoney = state.pools.money >= 40;

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
        {reunifying && (
          <div className="origin-grid-full">
            <dt>Custody hearing — week 9</dt>
            <dd>
              Reach all three and she comes home:
              <ul className="how-list">
                <li>A roof of your own — transitional or better {custodyHousing ? "(done)" : "(not yet)"}</li>
                <li>A clean record {custodyRecord ? "(done)" : "(not yet)"}</li>
                <li>$40 set aside {custodyMoney ? "(done)" : `($${state.pools.money} so far)`}</li>
              </ul>
            </dd>
          </div>
        )}
      </dl>
      <RunCodeShare state={state} hint="Share this code so others play the identical run." />
    </InfoModal>
  );
}

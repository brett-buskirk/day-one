// The weekly turn screen: pools, days left, due obligations, eligible actions,
// forced incident cards, and the end-of-week / end-of-run controls.
import type { Corpus, GameEvent, GameState } from "../engine";
import {
  eligibleActions,
  pendingEvents,
  dueObligations,
  isObligation,
  effectiveSlotCost,
  transportFactor,
  randomOrigin,
  RANDOM_ID,
} from "../engine";
import { useMemo, useState } from "react";
import type { ThemeMode } from "../theme";
import { POOL_META, slotsLabel, avatarFor, travelTaxNote } from "./format";
import { PoolBar } from "./PoolBar";
import { ConfirmDialog } from "./ConfirmDialog";
import { InfoModal } from "./InfoModal";
import { HowYouPlay } from "./HowYouPlay";
import { CharacterPanel } from "./CharacterPanel";
import { SECURE_BUILD } from "./build";

interface Props {
  state: GameState;
  corpus: Corpus;
  themeMode: ThemeMode;
  onToggleTheme: () => void;
  onOpenEvent: (eventId: string) => void;
  onEndWeek: () => void;
  onEndRun: () => void;
  onQuitToStart: () => void;
  onHelp: () => void;
}

function cheapestSlotCost(state: GameState, event: GameEvent): number {
  const costs = event.choices.map((c) => effectiveSlotCost(state, event, c));
  return costs.length ? Math.min(...costs) : 0;
}

// A clean spoken name for an action/obligation card: title + tags + day cost.
function cardLabel(e: GameEvent, cost: number): string {
  const bits = (e.tags ?? []).filter((t) => t !== "obligation");
  if (e.requires_travel) bits.push("requires travel");
  bits.push(cost > 0 ? `from ${slotsLabel(cost)}` : "no day cost");
  return `${e.title} — ${bits.join(", ")}`;
}

// Standing commitments that pre-spend a day each week (why the budget is < base).
const SLOT_COMMITMENTS: Record<string, string> = {
  mandated_treatment: "mandated treatment",
  community_service: "community service",
  home_detention: "home detention",
};

export function TurnScreen({
  state,
  corpus,
  themeMode,
  onToggleTheme,
  onOpenEvent,
  onEndWeek,
  onEndRun,
  onQuitToStart,
  onHelp,
}: Props) {
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showCharacter, setShowCharacter] = useState(false);
  // The origin behind this run (a corpus build, or one generated from the seed) —
  // for the character panel's name/age. Reproducible, so it's safe to derive here.
  const origin = useMemo(
    () =>
      state.characterId === RANDOM_ID
        ? randomOrigin(state.seed)
        : corpus.characters[state.characterId] ?? null,
    [state.characterId, state.seed, corpus]
  );
  const pending = pendingEvents(state, corpus);
  const obligations = dueObligations(state, corpus);
  const actions = eligibleActions(state, corpus).filter((e) => !isObligation(e));
  const thisWeekLog = state.log.filter((l) => l.turn === state.turn);

  // Explain a short week: which standing commitments pre-spend days (DESIGN §4).
  const commitments = (origin?.supervision.conditions ?? [])
    .map((c) => SLOT_COMMITMENTS[c])
    .filter(Boolean);
  const commitmentNote =
    state.standingSlots > 0 && commitments.length
      ? `${slotsLabel(state.standingSlots)} a week already goes to ${commitments.join(" and ")}.`
      : null;
  // Attribute the transport slot-tax so a 2-day errand reads as a consequence, not a quirk.
  const travelMult = transportFactor(state.pools.transportation);
  const travelNote = travelTaxNote(state.pools.transportation);

  return (
    <div className="screen">
      <header className="turn-head">
        <div className="turn-top">
          <span className="turn-week">
            Week {state.turn} <span className="of">of {state.endTurn}</span>
          </span>
          <div className="turn-head-actions">
            <button
              type="button"
              className="head-icon-btn head-avatar-btn"
              onClick={() => setShowCharacter(true)}
              aria-label="Your situation"
            >
              <span aria-hidden="true">{avatarFor(origin?.id ?? "")}</span>
            </button>
            <button
              type="button"
              className="head-icon-btn"
              onClick={() => setShowInfo(true)}
              aria-label="How to play"
            >
              ⓘ
            </button>
            <button
              type="button"
              className="theme-toggle"
              onClick={onToggleTheme}
              aria-label={`Switch to ${themeMode === "dark" ? "light" : "dark"} theme`}
            >
              {themeMode === "dark" ? "☀ Light" : "☾ Dark"}
            </button>
          </div>
        </div>
        <div className="turn-bottom">
          <span className="turn-slots-label">Days left this week</span>
          <span className="turn-slots-meter">
            <span className="slot-dots" aria-hidden="true">
              {Array.from({ length: Math.max(state.slots, state.baseSlots - state.standingSlots) }).map((_, i) => (
                <span key={i} className={`dot ${i < state.slots ? "dot-on" : "dot-off"}`} />
              ))}
            </span>
            <span className="turn-slots" aria-label={`${state.slots} action days left this week`}>
              {slotsLabel(state.slots)}
            </span>
          </span>
        </div>
        {commitmentNote && <p className="turn-commit">{commitmentNote}</p>}
        {travelNote && <p className="turn-commit turn-travel">{travelNote}</p>}
      </header>

      <section className="pools" aria-label="Resources">
        {POOL_META.map((p) => (
          <PoolBar key={p.key} poolKey={p.key} value={state.pools[p.key]} />
        ))}
      </section>

      {pending.length > 0 && (
        <section className="block block-incidents" aria-label="This week interrupts">
          <h2 className="block-title">This week interrupts</h2>
          <ul className="card-list">
            {pending.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  className="card card-incident"
                  onClick={() => onOpenEvent(e.id)}
                  aria-label={`${e.title} — interrupt, resolve now`}
                >
                  <span className="card-title">{e.title}</span>
                  <span className="card-cta">Resolve →</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {obligations.length > 0 && (
        <section className="block block-obligations" aria-label="Due this week">
          <h2 className="block-title">Due this week</h2>
          <ul className="card-list">
            {obligations.map((e) => {
              const cost = cheapestSlotCost(state, e);
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    className="card card-obligation"
                    onClick={() => onOpenEvent(e.id)}
                    aria-label={`Due: ${cardLabel(e, cost)}`}
                  >
                    <span className="card-title">{e.title}</span>
                    <span className="card-tags">
                      {e.requires_travel && (
                        <span className="tag tag-travel">
                          {travelMult > 1 ? `travel ×${travelMult}` : "travel"}
                        </span>
                      )}
                      <span className="tag tag-cost">{cost > 0 ? `from ${slotsLabel(cost)}` : "free"}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="muted small">Skip these and the week files a violation — your standing slips.</p>
        </section>
      )}

      <section className="block" aria-label="Things you can do this week">
        <h2 className="block-title">What will you do?</h2>
        {actions.length === 0 ? (
          <p className="muted">Nothing more you can act on this week.</p>
        ) : (
          <ul className="card-list">
            {actions.map((e) => {
              const cost = cheapestSlotCost(state, e);
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    className="card"
                    onClick={() => onOpenEvent(e.id)}
                    aria-label={cardLabel(e, cost)}
                  >
                    <span className="card-title">{e.title}</span>
                    <span className="card-tags">
                      {(e.tags ?? []).map((t) => (
                        <span key={t} className="tag">
                          {t}
                        </span>
                      ))}
                      {e.requires_travel && (
                        <span className="tag tag-travel">
                          {travelMult > 1 ? `travel ×${travelMult}` : "travel"}
                        </span>
                      )}
                      <span className="tag tag-cost">{cost > 0 ? `from ${slotsLabel(cost)}` : "free"}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {thisWeekLog.length > 0 && (
        <section className="block" aria-label="What happened this week">
          <h2 className="block-title">This week so far</h2>
          <ul className="feed">
            {thisWeekLog.map((l, i) => (
              <li key={i} className="feed-item">
                {l.text}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="end-week">
        <button
          type="button"
          className="primary"
          onClick={onEndWeek}
          disabled={pending.length > 0}
          aria-disabled={pending.length > 0}
        >
          {state.turn >= state.endTurn ? "Finish — see where things landed" : "End the week"}
        </button>
        {pending.length > 0 && <p className="muted center">Resolve what the week threw at you first.</p>}
        <button type="button" className="link-btn end-run-link" onClick={() => setConfirmingEnd(true)}>
          End run…
        </button>
      </div>

      {showInfo && (
        <InfoModal title="How to play" onClose={() => setShowInfo(false)}>
          <HowYouPlay />
          {!SECURE_BUILD && (
            <button
              type="button"
              className="help-link"
              onClick={() => {
                setShowInfo(false);
                onHelp();
              }}
            >
              Where to get help
            </button>
          )}
        </InfoModal>
      )}

      {showCharacter && (
        <CharacterPanel state={state} origin={origin} onClose={() => setShowCharacter(false)} />
      )}

      {confirmingEnd && (
        <ConfirmDialog
          title="End this run?"
          message="Stop here and see where things landed, or start over from the beginning. You can always keep playing."
          actions={[
            {
              label: "See where it landed",
              onClick: () => {
                setConfirmingEnd(false);
                onEndRun();
              },
            },
            {
              label: "Start over",
              variant: "danger",
              onClick: () => {
                setConfirmingEnd(false);
                onQuitToStart();
              },
            },
          ]}
          cancelLabel="Keep playing"
          onCancel={() => setConfirmingEnd(false)}
        />
      )}
    </div>
  );
}

import type { Choice, GameEvent, GameState } from "../engine";
import {
  isChoiceUnlocked,
  isChoiceAffordable,
  effectiveSlotCost,
  transportFactor,
  evalPredicate,
} from "../engine";
import { humanizeRequirement, slotsLabel } from "./format";
import { useDialogFocus } from "./useDialog";

interface Props {
  event: GameEvent;
  state: GameState;
  outcomeText: string | null;
  isPending: boolean;
  onChoose: (choice: Choice) => void;
  onContinue: () => void;
  onClose: () => void;
}

function CostChips({ event, state, choice }: { event: GameEvent; state: GameState; choice: Choice }) {
  const slots = effectiveSlotCost(state, event, choice);
  const money = choice.cost?.money ?? 0;
  const travelMult = event.requires_travel ? transportFactor(state.pools.transportation) : 1;
  if (slots === 0 && money === 0) return <span className="chip chip-free">No cost</span>;
  return (
    <>
      {slots > 0 && (
        <span className="chip">
          {slotsLabel(slots)}
          {travelMult > 1 ? ` · travel ×${travelMult}` : ""}
        </span>
      )}
      {money > 0 && <span className="chip">−{money} money</span>}
    </>
  );
}

function ChoiceButton({
  event,
  state,
  choice,
  onChoose,
}: {
  event: GameEvent;
  state: GameState;
  choice: Choice;
  onChoose: (c: Choice) => void;
}) {
  const unlocked = isChoiceUnlocked(state, choice);
  const affordable = isChoiceAffordable(state, event, choice);
  const selectable = unlocked && affordable;

  const reasons: string[] = [];
  if (!unlocked) {
    // Surface only the requirements that are currently unmet.
    for (const req of choice.requires ?? []) {
      if (!evalPredicate(state, req)) reasons.push(humanizeRequirement(req));
    }
  } else if (!affordable) {
    const slots = effectiveSlotCost(state, event, choice);
    const money = choice.cost?.money ?? 0;
    if (slots > state.slots) reasons.push(`Not enough days (need ${slotsLabel(slots)})`);
    if (money > state.pools.money) reasons.push(`Not enough money (need ${money})`);
  }

  return (
    <li className="choice">
      <button
        type="button"
        className="choice-btn"
        // Keep a locked choice in the a11y tree (aria-disabled, not the native
        // `disabled` attribute) so a screen reader reaches it and announces the
        // locked move AND its reason — the catch-22 is the teaching moment. The
        // click is guarded instead of the button being pulled from focus order.
        onClick={() => selectable && onChoose(choice)}
        aria-disabled={!selectable}
        aria-describedby={reasons.length ? `${choice.id}-why` : undefined}
      >
        <span className="choice-label">{choice.label}</span>
        <span className="choice-costs">
          <CostChips event={event} state={state} choice={choice} />
        </span>
      </button>
      {!selectable && reasons.length > 0 && (
        <p id={`${choice.id}-why`} className="choice-why">
          <span className="lock-icon" aria-hidden="true">
            🔒
          </span>{" "}
          {reasons.join(" · ")}
        </p>
      )}
    </li>
  );
}

export function EventDetail({
  event,
  state,
  outcomeText,
  isPending,
  onChoose,
  onContinue,
  onClose,
}: Props) {
  const dismiss = outcomeText ? onContinue : onClose;
  const { ref: sheetRef, onKeyDown } = useDialogFocus(dismiss);

  return (
    <div className="sheet-backdrop" role="presentation" onClick={dismiss}>
      <section
        ref={sheetRef}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        tabIndex={-1}
        onKeyDown={onKeyDown}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="sheet-handle-btn" aria-label="Close" onClick={dismiss}>
          <span className="sheet-handle" aria-hidden="true" />
        </button>
        <header className="sheet-head">
          <h2 id="sheet-title">{event.title}</h2>
          {isPending && <span className="badge badge-incident">This week interrupts</span>}
        </header>

        {/* Once an outcome is showing, drop the (already-read) full prompt so the
            result + Continue aren't pushed down the screen. */}
        {!outcomeText && <p className="prompt">{event.prompt}</p>}

        {outcomeText ? (
          <div className="outcome" role="status" aria-live="polite">
            <p className="outcome-text">{outcomeText}</p>
            <button type="button" className="primary" onClick={onContinue} autoFocus>
              Continue
            </button>
          </div>
        ) : (
          <>
            <ul className="choices" aria-label="Your options">
              {event.choices.map((c) => (
                <ChoiceButton key={c.id} event={event} state={state} choice={c} onChoose={onChoose} />
              ))}
            </ul>
            {!isPending && (
              <button type="button" className="link-btn" onClick={onClose}>
                Back
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}

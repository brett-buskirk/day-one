import { useEffect, useState } from "react";
import { corpus, archetypes } from "./content/corpus";
import {
  createRun,
  resolveChoice,
  endTurn,
  beginTurn,
  isRunOver,
  loadRun,
  randomSeed,
  type Choice,
  type GameState,
  type Mode,
} from "./engine";
import { saveRun, loadSavedRun, clearSavedRun } from "./db";
import {
  loadThemeMode,
  loadAccent,
  applyTheme,
  persistThemeMode,
  persistAccent,
  type ThemeMode,
  type Accent,
} from "./theme";
import { StartScreen } from "./ui/StartScreen";
import { Onboarding } from "./ui/Onboarding";
import { TurnScreen } from "./ui/TurnScreen";
import { EventDetail } from "./ui/EventDetail";
import { DebriefScreen } from "./ui/DebriefScreen";

type View = "start" | "onboarding" | "playing" | "debrief";

export default function App() {
  const [view, setView] = useState<View>("start");
  const [state, setState] = useState<GameState | null>(null);
  const [pendingStart, setPendingStart] = useState<{ characterId: string; mode: Mode } | null>(null);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [outcomeText, setOutcomeText] = useState<string | null>(null);
  const [savedRun, setSavedRun] = useState<GameState | null>(null);

  // Appearance (light/dark + accent), persisted and applied to <html>.
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => loadThemeMode());
  const [accent, setAccent] = useState<Accent>(() => loadAccent());
  useEffect(() => {
    applyTheme(themeMode, accent);
  }, [themeMode, accent]);

  const changeTheme = (mode: ThemeMode) => {
    setThemeMode(mode);
    persistThemeMode(mode);
  };
  const changeAccent = (a: Accent) => {
    setAccent(a);
    persistAccent(a);
  };

  // Offer to resume a run found in IndexedDB (DESIGN §11).
  useEffect(() => {
    let alive = true;
    loadSavedRun().then((s) => {
      if (alive) setSavedRun(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Persist + advance to the right screen on every state change.
  const commit = (next: GameState, nextView: View = "playing") => {
    setState(next);
    setView(nextView);
    void saveRun(next, Date.now());
  };

  // Start screen → onboarding (carry the chosen character + mode).
  const handleChooseCharacter = (characterId: string, mode: Mode) => {
    setPendingStart({ characterId, mode });
    setView("onboarding");
  };

  // Onboarding → begin the run.
  const handleBeginRun = () => {
    if (!pendingStart) return;
    setActiveEventId(null);
    setOutcomeText(null);
    // Empathy mode is the deliberate deep end: hardFail walks an outsider to the
    // edge of the cliff. Training keeps hardFail off (DESIGN §10).
    commit(
      createRun(corpus, pendingStart.characterId, {
        seed: randomSeed(),
        mode: pendingStart.mode,
        hardFail: pendingStart.mode === "empathy",
      })
    );
  };

  const resumeInto = (run: GameState) => {
    setActiveEventId(null);
    setOutcomeText(null);
    setState(run);
    setView(isRunOver(run) ? "debrief" : "playing");
  };

  const handleResume = () => {
    if (savedRun) resumeInto(savedRun);
  };

  // Import a serialized run (the classroom hook). Persists + resumes it.
  const handleImport = (serialized: string) => {
    const run = loadRun(serialized); // throws on bad payload; StartScreen catches
    setSavedRun(run);
    void saveRun(run, Date.now());
    resumeInto(run);
  };

  const handleChoose = (choice: Choice) => {
    if (!state || !activeEventId) return;
    const event = corpus.events[activeEventId];
    const next = resolveChoice(state, event, choice, corpus);
    setOutcomeText(next.log[next.log.length - 1]?.text ?? "");
    commit(next);
  };

  const handleContinueAfterOutcome = () => {
    setActiveEventId(null);
    setOutcomeText(null);
  };

  const handleEndWeek = () => {
    if (!state) return;
    setActiveEventId(null);
    setOutcomeText(null);
    const ended = endTurn(state, corpus);
    if (isRunOver(ended)) {
      commit(ended, "debrief");
    } else {
      commit(beginTurn(ended, corpus));
    }
  };

  const handlePlayAgain = () => {
    void clearSavedRun();
    setSavedRun(null);
    setState(null);
    setPendingStart(null);
    setActiveEventId(null);
    setOutcomeText(null);
    setView("start");
  };

  const activeEvent = activeEventId ? corpus.events[activeEventId] : null;
  const pendingOrigin = pendingStart ? corpus.characters[pendingStart.characterId] : null;

  return (
    <main className="app">
      {view === "start" && (
        <StartScreen
          characters={archetypes}
          hasSavedRun={!!savedRun}
          savedTurn={savedRun?.turn ?? null}
          savedMode={savedRun?.mode ?? null}
          savedCharacterName={savedRun ? corpus.characters[savedRun.characterId]?.name ?? null : null}
          themeMode={themeMode}
          accent={accent}
          onThemeMode={changeTheme}
          onAccent={changeAccent}
          onChoose={handleChooseCharacter}
          onResume={handleResume}
          onImport={handleImport}
        />
      )}

      {view === "onboarding" && pendingStart && pendingOrigin && (
        <Onboarding
          origin={pendingOrigin}
          mode={pendingStart.mode}
          onBegin={handleBeginRun}
          onBack={() => setView("start")}
        />
      )}

      {view === "playing" && state && (
        <>
          <TurnScreen
            state={state}
            corpus={corpus}
            themeMode={themeMode}
            onToggleTheme={() => changeTheme(themeMode === "dark" ? "light" : "dark")}
            onOpenEvent={(id) => {
              setOutcomeText(null);
              setActiveEventId(id);
            }}
            onEndWeek={handleEndWeek}
          />
          {activeEvent && (
            <EventDetail
              event={activeEvent}
              state={state}
              outcomeText={outcomeText}
              isPending={state.pending.includes(activeEvent.id)}
              onChoose={handleChoose}
              onContinue={handleContinueAfterOutcome}
              onClose={handleContinueAfterOutcome}
            />
          )}
        </>
      )}

      {view === "debrief" && state && (
        <DebriefScreen state={state} corpus={corpus} onPlayAgain={handlePlayAgain} />
      )}
    </main>
  );
}

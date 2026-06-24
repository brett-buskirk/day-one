// The canonical "how you play" quick reference. Shared by the About screen and
// the in-game info card so they never drift.
export function HowYouPlay() {
  return (
    <ul className="how-list">
      <li>
        A <strong>week is a turn</strong>. You get a few days to spend, and there's
        always more to do than days.
      </li>
      <li>
        You juggle five things — <strong>money, morale, support, getting around,
        and health</strong> — and they trade off.
      </li>
      <li>Errands cost <strong>days</strong> — more when you can't get around easily.</li>
      <li>
        The right move often shows up <strong>locked</strong>, with the reason.
        Seeing the wall before you can climb it <em>is</em> the point.
      </li>
      <li>
        Some things are <strong>due each week</strong> (a check-in). Skip them and
        there are consequences.
      </li>
      <li>
        <strong>Setbacks, not "game over."</strong> Run out of money and you get a
        crisis with choices, never a failure screen.
      </li>
      <li>
        You're scored on <strong>trajectory and decisions</strong> — shown in the
        debrief at day ninety.
      </li>
    </ul>
  );
}

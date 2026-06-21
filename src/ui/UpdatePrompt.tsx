// Surfaces a small banner when a newly deployed build is ready, and applies it
// on tap. We prompt rather than silently auto-reload so a player is never
// interrupted mid-run (the run is autosaved either way). Also registers the
// service worker. No-op in dev (the SW is disabled there).
import { useRegisterSW } from "virtual:pwa-register/react";

// How often a long-open tab re-checks for a new deploy (the browser also checks
// on navigation). Hourly is plenty for a turn-based game.
const UPDATE_CHECK_MS = 60 * 60 * 1000;

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        setInterval(() => void registration.update(), UPDATE_CHECK_MS);
      }
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="update-banner" role="status" aria-live="polite">
      <span className="update-banner-text">A new version of Day One is ready.</span>
      <div className="update-banner-actions">
        <button type="button" className="link-btn" onClick={() => setNeedRefresh(false)}>
          Later
        </button>
        <button type="button" className="primary" onClick={() => updateServiceWorker(true)}>
          Refresh
        </button>
      </div>
    </div>
  );
}

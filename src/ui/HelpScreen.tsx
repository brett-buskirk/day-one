// An always-available "Where to get help" view — reachable from the landing page,
// the in-game info card, and About — so resources never require finishing (or even
// starting) a run. Shows every resource regardless of mode.
import type { ResourceItem } from "../engine";
import { ResourceList } from "./ResourceList";

interface Props {
  resources: ResourceItem[];
  onBack: () => void;
}

export function HelpScreen({ resources, onBack }: Props) {
  return (
    <div className="screen help">
      <header className="hero">
        <h1>Where to get help</h1>
        <p className="tagline">
          Free, confidential places to start — real help, whether or not you're playing.
        </p>
      </header>

      {resources.length > 0 ? (
        <section className="block" aria-label="Resources">
          <div className="block-resources">
            <p className="muted small">
              These are national U.S. resources. Your area likely has more — dial 211 or
              ask any of these where to look locally.
            </p>
            <ResourceList resources={resources} />
          </div>
        </section>
      ) : (
        <p className="muted">No resources are configured yet.</p>
      )}

      <button type="button" className="link-btn" onClick={onBack}>
        ← Back
      </button>
    </div>
  );
}

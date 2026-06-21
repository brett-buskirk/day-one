// The reusable resource list, shared by the debrief and the standalone Help
// screen so both render the same `content/resources.yaml` data identically.
import type { ResourceItem } from "../engine";
import { humanizeCategory, shortUrl } from "./format";

export function ResourceList({ resources }: { resources: ResourceItem[] }) {
  return (
    <ul className="resources">
      {resources.map((r, i) => (
        <li key={i} className="resource">
          <span className="resource-cat">{humanizeCategory(r.category)}</span>
          <span className="resource-name">{r.name}</span>
          {r.note && <span className="muted small">{r.note}</span>}
          <span className="resource-contact">
            {r.phone && <span>{r.phone}</span>}
            {r.url && (
              <a href={r.url} target="_blank" rel="noreferrer">
                {shortUrl(r.url)}
              </a>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

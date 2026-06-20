import type { PoolKey } from "../engine";
import { POOL_META } from "./format";

interface Props {
  poolKey: PoolKey;
  value: number;
}

// Tone band for color + an at-a-glance word. Color is never the only signal
// (the number and label are always present) — for contrast/colorblind safety.
function band(value: number): "low" | "mid" | "high" {
  if (value < 30) return "low";
  if (value < 60) return "mid";
  return "high";
}

export function PoolBar({ poolKey, value }: Props) {
  const meta = POOL_META.find((p) => p.key === poolKey)!;
  const tone = band(value);
  return (
    <div className="pool">
      <div className="pool-head">
        <span className="pool-label">{meta.label}</span>
        <span className="pool-value">{value}</span>
      </div>
      <div
        className={`pool-track tone-${tone}`}
        role="meter"
        aria-label={`${meta.label}: ${meta.hint}`}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${value} of 100`}
      >
        <div className="pool-fill" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

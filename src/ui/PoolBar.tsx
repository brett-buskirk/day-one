// One labeled, accessible resource meter (a pool): number + bar + tone band.
import { useEffect, useRef, useState } from "react";
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

  // Post-choice feedback: when the value changes, briefly flash the bar and show
  // the delta (+N / −N), so a fast pool update is legible — "what just moved?".
  // The number renders regardless; only the motion is gated on reduced-motion (CSS).
  const prev = useRef(value);
  const [delta, setDelta] = useState<number | null>(null);
  useEffect(() => {
    if (prev.current !== value) {
      const d = Math.round(value - prev.current);
      prev.current = value;
      if (d !== 0) {
        setDelta(d);
        const t = setTimeout(() => setDelta(null), 2400);
        return () => clearTimeout(t);
      }
    }
  }, [value]);

  const dir = delta == null ? "" : delta > 0 ? "pool-up" : "pool-down";

  return (
    <div className={`pool ${dir}`.trim()}>
      <div className="pool-head">
        <span className="pool-label">{meta.label}</span>
        <span className="pool-value">
          {value}
          {delta != null && (
            <span className="pool-delta" aria-hidden="true">
              {delta > 0 ? `+${delta}` : delta}
            </span>
          )}
        </span>
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

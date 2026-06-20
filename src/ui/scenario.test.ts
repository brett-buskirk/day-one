import { describe, it, expect } from "vitest";
import { encodeScenario, parseScenario } from "./scenario";

const IDS = ["marcus", "renae", "dana", "theo", "ray"];

describe("scenario codes (facilitator/classroom)", () => {
  it("round-trips a scenario", () => {
    const s = { characterId: "marcus", mode: "training" as const, seed: 482913 };
    expect(encodeScenario(s)).toBe("marcus.training.482913");
    expect(parseScenario("marcus.training.482913", IDS)).toEqual(s);
  });

  it("is case-insensitive and trims", () => {
    expect(parseScenario("  THEO.Empathy.7  ", IDS)).toEqual({
      characterId: "theo",
      mode: "empathy",
      seed: 7,
    });
  });

  it("rejects unknown characters, bad modes, and bad seeds", () => {
    expect(parseScenario("nobody.training.1", IDS)).toBeNull();
    expect(parseScenario("marcus.casual.1", IDS)).toBeNull();
    expect(parseScenario("marcus.training.0", IDS)).toBeNull();
    expect(parseScenario("marcus.training.-5", IDS)).toBeNull();
    expect(parseScenario("marcus.training.abc", IDS)).toBeNull();
    expect(parseScenario("marcus.training.9999999999", IDS)).toBeNull(); // > uint32
    expect(parseScenario("garbage", IDS)).toBeNull();
  });
});

import { describe, it, expect } from "vitest";
import { travelTaxNote } from "./format";

// The transport slot-tax should read as an attributable squeeze, not an arbitrary number
// (reviewer Area 1). travelTaxNote turns the multiplier into a stated, actionable reason.
describe("travelTaxNote (attributing the transport slot-tax)", () => {
  it("is null when a car means there's no tax", () => {
    expect(travelTaxNote(80)).toBeNull();
    expect(travelTaxNote(70)).toBeNull();
  });

  it("flags the ×1.5 tax without a car", () => {
    const note = travelTaxNote(45);
    expect(note).toContain("×1.5");
    expect(note).toMatch(/car/);
  });

  it("flags the ×2 tax on foot, and names the fix", () => {
    const note = travelTaxNote(10);
    expect(note).toContain("×2");
    expect(note).toMatch(/bus pass or car/);
  });
});

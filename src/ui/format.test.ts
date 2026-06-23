import { describe, it, expect } from "vitest";
import { travelTaxNote } from "./format";

// The transport slot-tax should read as an attributable squeeze, not an arbitrary number
// (reviewer Area 1). travelTaxNote turns the multiplier into a stated, actionable reason.
describe("travelTaxNote (attributing the transport slot-tax)", () => {
  it("is null with reliable transit — a car or a bus pass (≥30)", () => {
    expect(travelTaxNote(80)).toBeNull(); // car
    expect(travelTaxNote(45)).toBeNull(); // bus pass — reliable, no tax
    expect(travelTaxNote(30)).toBeNull();
  });

  it("flags the ×2 tax on foot (<30), and names the fix", () => {
    const note = travelTaxNote(10);
    expect(note).toContain("×2");
    expect(note).toMatch(/bus pass or car/);
  });
});

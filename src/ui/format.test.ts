import { describe, it, expect } from "vitest";
import { travelTaxNote, humanizeCredential } from "./format";

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

// Guards the acronym-casing fix: the generic humanizer title-cases each word, so
// acronyms (CNA, GED, HVAC) came out "Cna" / "Ged" / "Hvac" until labeled.
describe("credential labels (acronym casing)", () => {
  it("renders acronyms correctly, not naively title-cased", () => {
    expect(humanizeCredential("cert_cna")).toBe("Certified nursing assistant (CNA)");
    expect(humanizeCredential("ged")).toBe("GED");
    expect(humanizeCredential("cert_hvac")).toBe("HVAC certificate");
  });

  it("still falls back gracefully for an unlabeled credential", () => {
    expect(humanizeCredential("cert_plumbing")).toBe("Plumbing");
  });
});

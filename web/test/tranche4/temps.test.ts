import { describe, it, expect } from "vitest";
import {
  parseChrono,
  formatChrono,
  etiquetteTemps,
  saisieVersInterval,
} from "@/lib/juge/temps";

/**
 * Tranche 4 (juge) — conversion du temps de vitesse (doc 05 §4).
 * Cas spéciaux : « À réaliser » = null, « Chute » = -1 min, « Abandon » = -2 min.
 */
describe("parseChrono", () => {
  it("interprète des secondes décimales", () => {
    expect(parseChrono("12.34")).toBeCloseTo(12.34, 5);
  });

  it("interprète mm:ss.cc", () => {
    expect(parseChrono("1:02.50")).toBeCloseTo(62.5, 5);
    expect(parseChrono("01:02.50")).toBeCloseTo(62.5, 5);
  });

  it("interprète hh:mm:ss", () => {
    expect(parseChrono("1:00:00")).toBeCloseTo(3600, 5);
  });

  it("rejette une saisie invalide", () => {
    expect(parseChrono("")).toBeNull();
    expect(parseChrono("abc")).toBeNull();
    expect(parseChrono("1:2:3:4")).toBeNull();
  });
});

describe("formatChrono", () => {
  it("formate en mm:ss.cc avec zéros de tête", () => {
    expect(formatChrono(12.34)).toBe("00:12.34");
    expect(formatChrono(62.5)).toBe("01:02.50");
  });

  it("gère l'arrondi au centième sans déborder", () => {
    expect(formatChrono(59.999)).toBe("01:00.00");
  });
});

describe("etiquetteTemps", () => {
  it("affiche « À réaliser » pour null", () => {
    expect(etiquetteTemps(null)).toBe("À réaliser");
  });

  it("reconnaît Chute (-1 min) et Abandon (-2 min)", () => {
    expect(etiquetteTemps("-00:01:00")).toBe("Chute");
    expect(etiquetteTemps("-00:02:00")).toBe("Abandon");
  });

  it("formate un temps réel", () => {
    expect(etiquetteTemps("00:00:12.34")).toBe("00:12.34");
  });
});

describe("saisieVersInterval", () => {
  it("mappe les cas spéciaux et le temps", () => {
    expect(saisieVersInterval({ kind: "areal" })).toBeNull();
    expect(saisieVersInterval({ kind: "chute" })).toBe("-1 minutes");
    expect(saisieVersInterval({ kind: "abandon" })).toBe("-2 minutes");
    expect(saisieVersInterval({ kind: "temps", secondes: 12.34 })).toBe("12.34 seconds");
  });
});

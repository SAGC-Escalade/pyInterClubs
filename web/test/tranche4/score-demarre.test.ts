import { describe, it, expect } from "vitest";
import { estDemarre } from "@/lib/leader/score";

/**
 * Tranche 4 (coach) — verrou « started » (doc 04 §4, api/serializers.py:220).
 * Un membre est « démarré » dès qu'une performance de DIFF a des points : on
 * fige alors l'affectation groupée (re-affecter les diffs casserait le score).
 */
describe("estDemarre", () => {
  it("faux sans performance", () => {
    expect(estDemarre([])).toBe(false);
  });

  it("vrai si une diff a des points", () => {
    expect(estDemarre([{ type: 2, points: 3 }])).toBe(true);
  });

  it("faux si la diff n'a pas encore de points", () => {
    expect(estDemarre([{ type: 2, points: null }])).toBe(false);
  });

  it("ignore les points de bloc/vitesse (seules les diffs comptent)", () => {
    expect(
      estDemarre([
        { type: 1, points: 4 },
        { type: 3, points: 12 },
      ]),
    ).toBe(false);
  });

  it("ignore une diff non encore affectée (type null)", () => {
    expect(estDemarre([{ type: null, points: null }])).toBe(false);
  });
});

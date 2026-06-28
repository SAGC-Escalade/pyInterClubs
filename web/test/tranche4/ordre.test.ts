import { describe, it, expect } from "vitest";
import { prochainOrdreLibre } from "@/lib/leader/ordre";

/**
 * Tranche 4 (coach) — l'ordre d'un membre dans l'équipe est le plus petit entier
 * libre dans 1..8 (jamais de trou ni de doublon, doc 04 §5). null = équipe pleine.
 */
describe("prochainOrdreLibre", () => {
  it("renvoie 1 pour une équipe vide", () => {
    expect(prochainOrdreLibre([])).toBe(1);
  });

  it("renvoie le premier entier libre après une suite", () => {
    expect(prochainOrdreLibre([1, 2, 3])).toBe(4);
  });

  it("comble le plus petit trou", () => {
    expect(prochainOrdreLibre([1, 3, 4])).toBe(2);
    expect(prochainOrdreLibre([2, 3])).toBe(1);
  });

  it("ignore l'ordre des entrées et les doublons", () => {
    expect(prochainOrdreLibre([3, 1, 1, 2])).toBe(4);
  });

  it("renvoie null quand les 8 places sont prises", () => {
    expect(prochainOrdreLibre([1, 2, 3, 4, 5, 6, 7, 8])).toBeNull();
  });
});

import { describe, it, expect } from "vitest";
import {
  SEXE,
  CATEGORIE,
  GENRE,
  TYPE_VOIE,
  SEXE_OPTIONS,
  GENRE_OPTIONS,
  TYPE_VOIE_OPTIONS,
} from "@/lib/constants";

/**
 * Tranches 2/3 — libellés FR des énumérations (codes identiques au schéma SQL).
 * Garde-fou contre une dérive des codes numériques persistés.
 */
describe("constants (libellés énumérations)", () => {
  it("SEXE : 1 Femme, 2 Homme, 3 Mixte", () => {
    expect(SEXE).toEqual({ 1: "Femme", 2: "Homme", 3: "Mixte" });
  });

  it("GENRE partage le domaine de SEXE", () => {
    expect(GENRE).toBe(SEXE);
  });

  it("CATEGORIE : 1 Enfants, 2 Adolescents, 3 Mixte", () => {
    expect(CATEGORIE).toEqual({ 1: "Enfants", 2: "Adolescents", 3: "Mixte" });
  });

  it("TYPE_VOIE : 1 Bloc, 2 Difficulté, 3 Vitesse", () => {
    expect(TYPE_VOIE).toEqual({ 1: "Bloc", 2: "Difficulté", 3: "Vitesse" });
  });

  it("SEXE_OPTIONS n'expose que Femme/Homme (pas Mixte) pour un grimpeur", () => {
    expect(SEXE_OPTIONS).toEqual([
      { value: 1, label: "Femme" },
      { value: 2, label: "Homme" },
    ]);
  });

  it("GENRE_OPTIONS expose les trois valeurs (voie)", () => {
    expect(GENRE_OPTIONS.map((o) => o.value)).toEqual([1, 2, 3]);
  });

  it("TYPE_VOIE_OPTIONS couvre les trois types de voie", () => {
    expect(TYPE_VOIE_OPTIONS.map((o) => o.label)).toEqual([
      "Bloc",
      "Difficulté",
      "Vitesse",
    ]);
  });
});

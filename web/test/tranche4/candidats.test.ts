import { describe, it, expect } from "vitest";
import { bornesAnneeNaissance } from "@/lib/leader/candidats";

/**
 * Tranche 4 (coach) — filtre catégorie d'âge des grimpeurs proposés (doc 04 §3).
 * Port fidèle de GrimpeurQuerySet.enfants/adolescents (core/models.py) :
 *   enfants     : âge 8..13  -> naissance ∈ [saison-13, saison-8]
 *   ado / mixte : âge 13..19 -> naissance ∈ [saison-19, saison-13]
 */
describe("bornesAnneeNaissance", () => {
  it("catégorie enfants : âge 8 à 13 ans", () => {
    expect(bornesAnneeNaissance(1, 2025)).toEqual({ min: 2012, max: 2017 });
  });

  it("catégorie adolescents : âge 13 à 19 ans", () => {
    expect(bornesAnneeNaissance(2, 2025)).toEqual({ min: 2006, max: 2012 });
  });

  it("catégorie mixte : repli sur la tranche adolescents (comme le legacy)", () => {
    expect(bornesAnneeNaissance(3, 2025)).toEqual({ min: 2006, max: 2012 });
  });
});

import { describe, it, expect } from "vitest";
import { categorieAge } from "@/lib/categorie";

/**
 * Tranche 1 — catégorie d'âge affichée au classement public (port de
 * ranking.jsx / getCategorie). L'âge = saison - année de naissance.
 */
describe("categorieAge", () => {
  const SAISON = 2025;

  it.each([
    [2017, "U11"], // 8 ans
    [2016, "U11"], // 9 ans
    [2015, "U13"], // 10 ans
    [2014, "U13"], // 11 ans
    [2013, "U15"], // 12 ans
    [2012, "U15"], // 13 ans
    [2011, "U17"], // 14 ans
    [2010, "U17"], // 15 ans
    [2009, "U19"], // 16 ans
    [2008, "U19"], // 17 ans
    [2007, "U21"], // 18 ans
    [2006, "U21"], // 19 ans
  ])("année %i (saison %i) -> %s", (annee, attendu) => {
    expect(categorieAge(annee, SAISON)).toBe(attendu);
  });

  it("classe les bornes de tranche correctement (8 et 9 ans -> U11)", () => {
    expect(categorieAge(SAISON - 8, SAISON)).toBe("U11");
    expect(categorieAge(SAISON - 9, SAISON)).toBe("U11");
  });

  it("renvoie « Hors catégorie » sous 8 ans", () => {
    expect(categorieAge(SAISON - 7, SAISON)).toBe("Hors catégorie");
  });

  it("renvoie « Hors catégorie » au-delà de 19 ans", () => {
    expect(categorieAge(SAISON - 20, SAISON)).toBe("Hors catégorie");
  });
});

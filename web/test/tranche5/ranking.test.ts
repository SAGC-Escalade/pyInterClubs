import { describe, it, expect } from "vitest";
import {
  classer,
  agregerGrimpeurs,
  agregerEquipes,
  grouperParClub,
} from "@/lib/reports/ranking";

/**
 * Tranche 5 — Rapports : agrégation et classement avec ex æquo.
 * Port fidèle de admin/views.py (RencontreReportViewMixin.ranking,
 * MultiRencontreReportViewMixin.sort, SeasonTeamsReportView). Cf. doc 09.
 */

describe("classer (ex æquo)", () => {
  it("trie par points décroissants et numérote à partir de 1", () => {
    const r = classer(
      [
        { nom: "B", points: 10 },
        { nom: "A", points: 30 },
        { nom: "C", points: 20 },
      ],
      (s) => s.points,
    );
    expect(r.map((s) => [s.nom, s.rang])).toEqual([
      ["A", 1],
      ["C", 2],
      ["B", 3],
    ]);
  });

  it("partage le rang à points égaux puis saute d'autant de rangs", () => {
    // 30, 30, 20, 20, 20, 5 -> rangs 1,1,3,3,3,6 (comme le helper Django).
    const r = classer(
      [
        { id: 1, points: 30 },
        { id: 2, points: 20 },
        { id: 3, points: 30 },
        { id: 4, points: 5 },
        { id: 5, points: 20 },
        { id: 6, points: 20 },
      ],
      (s) => s.points,
    );
    expect(r.map((s) => s.rang)).toEqual([1, 1, 3, 3, 3, 6]);
  });

  it("est stable pour un même score (conserve l'ordre d'entrée)", () => {
    const r = classer(
      [
        { nom: "X", points: 10 },
        { nom: "Y", points: 10 },
        { nom: "Z", points: 10 },
      ],
      (s) => s.points,
    );
    expect(r.map((s) => s.nom)).toEqual(["X", "Y", "Z"]);
    expect(r.every((s) => s.rang === 1)).toBe(true);
  });

  it("renvoie une liste vide pour une entrée vide", () => {
    expect(classer([], (s: { points: number }) => s.points)).toEqual([]);
  });
});

describe("agregerGrimpeurs (classement individuel de saison)", () => {
  it("somme les points d'un grimpeur sur plusieurs rencontres puis classe", () => {
    const r = agregerGrimpeurs([
      { grimpeur_id: 1, grimpeur: { nom: "Dupont" }, points: 10 },
      { grimpeur_id: 2, grimpeur: { nom: "Martin" }, points: 40 },
      { grimpeur_id: 1, grimpeur: { nom: "Dupont" }, points: 25 }, // +25 => 35
    ]);
    expect(r).toEqual([
      { grimpeur_id: 2, grimpeur: { nom: "Martin" }, points: 40, rang: 1 },
      { grimpeur_id: 1, grimpeur: { nom: "Dupont" }, points: 35, rang: 2 },
    ]);
  });
});

describe("agregerEquipes (classement équipes de saison)", () => {
  it("regroupe par club + numéro et somme les points", () => {
    const r = agregerEquipes([
      { club_id: 1, club: { nom: "CAF" }, numero: 1, points: 10 },
      { club_id: 1, club: { nom: "CAF" }, numero: 1, points: 15 }, // même équipe -> 25
      { club_id: 1, club: { nom: "CAF" }, numero: 2, points: 30 }, // équipe 2 distincte
      { club_id: 2, club: { nom: "Pyre" }, numero: 1, points: 30 },
    ]);
    // 30 (CAF#2) et 30 (Pyre#1) ex æquo au rang 1, puis 25 (CAF#1) au rang 3.
    expect(r.map((e) => [e.club_id, e.numero, e.points, e.rang])).toEqual([
      [1, 2, 30, 1],
      [2, 1, 30, 1],
      [1, 1, 25, 3],
    ]);
  });
});

describe("grouperParClub (rapport des inscriptions)", () => {
  it("dédoublonne par grimpeur puis groupe et trie club/nom/prénom", () => {
    const r = grouperParClub([
      { id: 3, nom: "Zoe", prenom: "A", club_nom: "Alpha" },
      { id: 1, nom: "Blanc", prenom: "Léa", club_nom: "Beta" },
      { id: 2, nom: "Blanc", prenom: "Amir", club_nom: "Beta" },
      { id: 1, nom: "Blanc", prenom: "Léa", club_nom: "Beta" }, // doublon -> ignoré
    ]);
    expect(r.map((g) => g.club)).toEqual(["Alpha", "Beta"]);
    // Dans Beta : tri par nom puis prénom (Amir avant Léa).
    expect(r[1].grimpeurs.map((x) => x.prenom)).toEqual(["Amir", "Léa"]);
  });
});

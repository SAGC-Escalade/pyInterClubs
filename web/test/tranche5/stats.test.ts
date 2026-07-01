import { describe, it, expect } from "vitest";
import { ordonnerVoies, construireStats } from "@/lib/reports/stats";
import type { VoieStat, PerfStat } from "@/lib/reports/stats";

/**
 * Tranche 5 — Rapport « Stats » : agrégation des passages par voie / genre /
 * état / type + nuage de temps. Port de StatsReportView (admin/views.py:232-310).
 * Cf. doc 09 §2.
 */

const voie = (over: Partial<VoieStat>): VoieStat => ({
  id: 1,
  nom: "Bloc 1",
  type: 1,
  zones: [
    { label: "A réaliser", points: null },
    { label: "Zone", points: 5 },
    { label: "Top", points: 10 },
  ],
  ...over,
});

const perf = (over: Partial<PerfStat>): PerfStat => ({
  voie_id: 1,
  etat: 2,
  points: 10,
  temps_sec: null,
  sexe: 2,
  ...over,
});

describe("ordonnerVoies", () => {
  it("ordonne les diffs par niveau numérique (D2 avant D10)", () => {
    const voies = [
      voie({ id: 1, nom: "D10 dévers", type: 2 }),
      voie({ id: 2, nom: "D2 dalle", type: 2 }),
    ];
    expect(ordonnerVoies(voies).map((v) => v.id)).toEqual([2, 1]);
  });
});

describe("construireStats", () => {
  const voies = [
    voie({ id: 1, nom: "Bloc 1", type: 1 }),
    voie({ id: 2, nom: "Bloc 2", type: 1 }),
  ];

  it("ajoute une colonne « Abandon » en fin de labels", () => {
    const s = construireStats(voies, []);
    expect(s.labels).toEqual(["Bloc 1", "Bloc 2", "Abandon"]);
  });

  it("compte les passages par genre sur la bonne voie", () => {
    const s = construireStats(voies, [
      perf({ voie_id: 1, sexe: 2, etat: 2, points: 10 }),
      perf({ voie_id: 1, sexe: 1, etat: 1, points: 5 }),
      perf({ voie_id: 2, sexe: 2, etat: 2, points: 10 }),
    ]);
    const hommes = s.datasets.find((d) => d.categorie === "genre" && d.label === "Homme");
    const femmes = s.datasets.find((d) => d.categorie === "genre" && d.label === "Femme");
    // Colonnes : [Bloc 1, Bloc 2, Abandon]
    expect(hommes?.data).toEqual([1, 1, 0]);
    expect(femmes?.data).toEqual([1, 0, 0]);
  });

  it("range les perfs sans points (ou Abandon) dans la colonne « Abandon »", () => {
    const s = construireStats(voies, [
      perf({ voie_id: 1, sexe: 2, etat: null, points: null }), // non scoré -> Abandon
      perf({ voie_id: 1, sexe: 2, etat: 2, points: 10 }), // Bloc 1
    ]);
    const hommes = s.datasets.find((d) => d.categorie === "genre" && d.label === "Homme");
    expect(hommes?.data).toEqual([1, 0, 1]); // 1 sur Bloc 1, 1 en Abandon
  });

  it("alimente le nuage de temps avec les secondes des perfs vitesse", () => {
    const vitesse = voie({
      id: 3,
      nom: "Vitesse",
      type: 3,
      zones: [{ label: "{rank}>=0", points: "20-{rank}" }],
    });
    const s = construireStats([vitesse], [
      perf({ voie_id: 3, sexe: 2, etat: 0, points: 20, temps_sec: 12.34 }),
    ]);
    expect(s.temps).toEqual([{ x: "Vitesse", y: 12.34 }]);
  });

  it("ignore les zones calculées ({rank}) dans les états", () => {
    const vitesse = voie({
      id: 3,
      nom: "Vitesse",
      type: 3,
      zones: [{ label: "{rank}>=0", points: "20-{rank}" }],
    });
    const s = construireStats([vitesse], [
      perf({ voie_id: 3, sexe: 2, etat: 0, points: 20, temps_sec: 10 }),
    ]);
    expect(s.datasets.some((d) => d.categorie === "etat" && d.label.includes("rank"))).toBe(
      false,
    );
  });
});

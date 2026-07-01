/**
 * Tranche 5 — Rapport « Stats » : agrégation des passages par voie / genre /
 * état / type + nuage de temps, pour un graphe Chart.js empilé.
 * Port fidèle de StatsReportView (admin/views.py:232-310). Cf. doc 09 §2.
 */

import { SEXE, TYPE_VOIE } from "@/lib/constants";

export type Zone = { label: string; points: number | null | string };

export type VoieStat = {
  id: number;
  nom: string;
  type: number; // 1 bloc, 2 diff, 3 vitesse
  zones: Zone[];
};

export type PerfStat = {
  voie_id: number | null;
  etat: number | null; // index dans zones
  points: number | null;
  temps_sec: number | null;
  sexe: number; // 1 F, 2 H, 3 mixte
};

export type StatDataset = {
  categorie: "genre" | "etat" | "type";
  label: string;
  data: number[];
};

export type Stats = {
  labels: string[];
  datasets: StatDataset[];
  temps: { x: string; y: number }[];
  max: number;
};

const COLONNE_ABANDON = "Abandon";

/**
 * Ordre d'affichage des voies (port de views.py:240-243) : par première lettre
 * du nom, puis pour les diffs par niveau numérique (D2 avant D10), sinon par nom.
 */
export function ordonnerVoies<V extends VoieStat>(voies: V[]): V[] {
  const niveau = (v: VoieStat) => parseInt(v.nom.split(" ")[0].slice(1), 10) || 0;
  return [...voies].sort((a, b) => {
    const ca = a.nom.charAt(0);
    const cb = b.nom.charAt(0);
    if (ca !== cb) return ca.localeCompare(cb, "fr");
    if (a.type === 2 && b.type === 2) return niveau(a) - niveau(b);
    return a.nom.localeCompare(b.nom, "fr");
  });
}

/**
 * Construit les séries du graphe de stats à partir des voies et des perfs.
 * Les perfs sans points (ou à l'état « Abandon ») sont rangées dans la colonne
 * « Abandon » ; les états calculés `{rank}` (vitesse) sont ignorés.
 */
export function construireStats(voies: VoieStat[], perfs: PerfStat[]): Stats {
  const ordonnees = ordonnerVoies(voies);
  const labels = [...ordonnees.map((v) => v.nom), COLONNE_ABANDON];
  const parId = new Map(ordonnees.map((v) => [v.id, v]));

  // counts[label][clé] : clé = code sexe (number) ou libellé d'état (string).
  const byGenre = new Map<string, Map<number, number>>();
  const byEtat = new Map<string, Map<string, number>>();
  const temps: { x: string; y: number }[] = [];

  const incGenre = (l: string, sexe: number) => {
    const m = byGenre.get(l) ?? new Map<number, number>();
    m.set(sexe, (m.get(sexe) ?? 0) + 1);
    byGenre.set(l, m);
  };
  const incEtat = (l: string, etat: string) => {
    const m = byEtat.get(l) ?? new Map<string, number>();
    m.set(etat, (m.get(etat) ?? 0) + 1);
    byEtat.set(l, m);
  };

  for (const p of perfs) {
    const voie = p.voie_id != null ? parId.get(p.voie_id) : undefined;
    let etatLabel =
      voie && p.etat != null ? voie.zones[p.etat]?.label ?? null : null;
    let colonne = voie ? voie.nom : COLONNE_ABANDON;

    // Perf non aboutie -> colonne « Abandon », état = libellé du type de voie.
    if (!voie || p.points == null || etatLabel === COLONNE_ABANDON) {
      colonne = COLONNE_ABANDON;
      etatLabel = TYPE_VOIE[voie ? voie.type : 2];
    }

    if (p.temps_sec != null) temps.push({ x: colonne, y: p.temps_sec });

    incGenre(colonne, p.sexe);
    if (etatLabel != null) incEtat(colonne, etatLabel);
  }

  const datasets: StatDataset[] = [];
  let maximum = 0;

  // Séries par genre (femme, homme, mixte).
  for (const code of [1, 2, 3]) {
    const data = labels.map((l) => byGenre.get(l)?.get(code) ?? 0);
    maximum += Math.max(0, ...data);
    datasets.push({ categorie: "genre", label: SEXE[code], data });
  }

  // États dans l'ordre du barème (voies parcourues en sens inverse), hors {rank}.
  const etats: string[] = [];
  for (const v of [...ordonnees].reverse()) {
    for (const z of v.zones) {
      if (z.label.includes("rank")) continue;
      if (!etats.includes(z.label)) etats.push(z.label);
    }
  }
  for (const etat of etats) {
    if (["a réaliser", "abandon"].includes(etat.toLowerCase())) continue;
    const data = labels.map((l) => byEtat.get(l)?.get(etat) ?? 0);
    datasets.push({ categorie: "etat", label: etat, data });
  }

  // Séries par type (les perfs abandonnées comptées par libellé de type).
  for (const code of [1, 2, 3]) {
    const label = TYPE_VOIE[code];
    const data = labels.map((l) => byEtat.get(l)?.get(label) ?? 0);
    datasets.push({ categorie: "type", label, data });
  }

  const maxTemps = temps.length ? Math.max(...temps.map((t) => t.y)) : 0;
  const base = Math.max(maximum, maxTemps);
  const max = 10 * (1 + Math.floor(base / 10));

  return { labels, datasets, temps, max };
}

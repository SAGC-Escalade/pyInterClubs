/**
 * Tranche 5 — Rapports : agrégation et classement avec ex æquo.
 * Port fidèle de admin/views.py (RencontreReportViewMixin.ranking:166-174,
 * MultiRencontreReportViewMixin.sort:210-219, SeasonTeamsReportView:380-389).
 * Cf. doc 09.
 */

export type Classe<T> = T & { rang: number };

/**
 * Classement avec ex æquo (port de `ranking`, views.py:166-174) : trie par
 * points décroissants, attribue le même rang aux points égaux, puis saute
 * d'autant de rangs que la taille du groupe. Le rang commence à 1 ; le tri est
 * stable (les égaux conservent leur ordre d'entrée).
 */
export function classer<T>(items: T[], points: (t: T) => number): Classe<T>[] {
  const tries = items
    .map((item, i) => ({ item, i }))
    .sort((a, b) => points(b.item) - points(a.item) || a.i - b.i)
    .map((w) => w.item);

  const resultat: Classe<T>[] = [];
  let rang = 1;
  for (let i = 0; i < tries.length; ) {
    let j = i;
    while (j < tries.length && points(tries[j]) === points(tries[i])) j++;
    for (let k = i; k < j; k++) resultat.push({ ...tries[k], rang });
    rang += j - i; // saut de rang égal à la taille du groupe ex æquo
    i = j;
  }
  return resultat;
}

export type ScoreGrimpeur<G> = { grimpeur_id: number; grimpeur: G; points: number };

/**
 * Classement individuel de saison : somme les points d'un grimpeur sur toutes
 * les rencontres, puis classe (port de `sort`, views.py:210-219).
 */
export function agregerGrimpeurs<G>(
  scores: ScoreGrimpeur<G>[],
): Classe<ScoreGrimpeur<G>>[] {
  const groupes = new Map<number, ScoreGrimpeur<G>>();
  for (const s of scores) {
    const acc = groupes.get(s.grimpeur_id);
    if (acc) acc.points += s.points;
    else
      groupes.set(s.grimpeur_id, {
        grimpeur_id: s.grimpeur_id,
        grimpeur: s.grimpeur,
        points: s.points,
      });
  }
  return classer([...groupes.values()], (s) => s.points);
}

export type ScoreEquipe<C> = {
  club_id: number;
  club: C;
  numero: number;
  points: number;
};

/**
 * Classement équipes de saison : regroupe par club + numéro (clé `__str__` de
 * l'ancien modèle), somme les points, puis classe (port de
 * SeasonTeamsReportView, views.py:380-389).
 */
export function agregerEquipes<C>(
  equipes: ScoreEquipe<C>[],
): Classe<ScoreEquipe<C>>[] {
  const groupes = new Map<string, ScoreEquipe<C>>();
  for (const e of equipes) {
    const cle = `${e.club_id}#${e.numero}`;
    const acc = groupes.get(cle);
    if (acc) acc.points += e.points;
    else
      groupes.set(cle, {
        club_id: e.club_id,
        club: e.club,
        numero: e.numero,
        points: e.points,
      });
  }
  return classer([...groupes.values()], (e) => e.points);
}

export type GrimpeurClub = {
  id: number;
  nom: string;
  prenom: string;
  club_nom: string;
};

/**
 * Rapport des inscriptions : dédoublonne les grimpeurs par id, trie par
 * club / nom / prénom, puis groupe par club (port de RegistrationReportView,
 * views.py:343-346).
 */
export function grouperParClub<G extends GrimpeurClub>(
  grimpeurs: G[],
): { club: string; grimpeurs: G[] }[] {
  const uniques = new Map<number, G>();
  for (const g of grimpeurs) if (!uniques.has(g.id)) uniques.set(g.id, g);

  const cmp = (a: string, b: string) => a.localeCompare(b, "fr");
  const tries = [...uniques.values()].sort(
    (a, b) =>
      cmp(a.club_nom, b.club_nom) || cmp(a.nom, b.nom) || cmp(a.prenom, b.prenom),
  );

  const groupes: { club: string; grimpeurs: G[] }[] = [];
  for (const g of tries) {
    const dernier = groupes[groupes.length - 1];
    if (dernier && dernier.club === g.club_nom) dernier.grimpeurs.push(g);
    else groupes.push({ club: g.club_nom, grimpeurs: [g] });
  }
  return groupes;
}

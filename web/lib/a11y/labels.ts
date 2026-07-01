/**
 * Tranche 8 — libellés d'accessibilité (doc 08 §6, scénario T8-04). Intitulés
 * `aria-label` dérivés de façon pure pour les rangs, médailles, équipes et
 * champs de saisie, afin d'offrir des annonces stables aux lecteurs d'écran.
 */

/** Accorde « point » / « points » selon la quantité. */
function points(n: number): string {
  return `${n} ${n < 2 ? "point" : "points"}`;
}

/** Libellé de médaille pour un rang de podium (1..3), sinon null. */
export function medalLabel(rang: number): string | null {
  switch (rang) {
    case 1:
      return "Médaille d'or";
    case 2:
      return "Médaille d'argent";
    case 3:
      return "Médaille de bronze";
    default:
      return null;
  }
}

export type ClassementRow = {
  rang: number;
  prenom: string;
  nom: string;
  points: number;
};

/** « Rang 1, Léa Martin, 42 points, Médaille d'or ». */
export function ariaLabelClassementRow(row: ClassementRow): string {
  const base = `Rang ${row.rang}, ${row.prenom} ${row.nom}, ${points(row.points)}`;
  const medaille = medalLabel(row.rang);
  return medaille ? `${base}, ${medaille}` : base;
}

export type EquipeRow = {
  clubNom: string;
  numero: number;
  points: number;
  valide: boolean;
};

/** « Équipe CAF Bordeaux numéro 2, 120 points, validée ». */
export function ariaLabelEquipe(row: EquipeRow): string {
  const etat = row.valide ? "validée" : "en cours";
  return `Équipe ${row.clubNom} numéro ${row.numero}, ${points(row.points)}, ${etat}`;
}

export type PerfInputRef = {
  voieNom: string;
  grimpeur: string;
};

/** « Performance de Léa Martin sur la voie M1 ». */
export function ariaLabelPerfInput(ref: PerfInputRef): string {
  return `Performance de ${ref.grimpeur} sur la voie ${ref.voieNom}`;
}

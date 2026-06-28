/**
 * Tranche 4 (coach) — ordre d'un membre dans l'équipe (doc 04 §5).
 * L'ordre est le plus petit entier libre dans 1..8 ; une équipe est limitée à
 * 8 membres. Le calcul fait foi côté SQL (fn_inscrire_grimpeur) ; ce helper sert
 * à pré-remplir/désactiver l'ajout côté UI.
 */
export const TAILLE_MAX_EQUIPE = 8;

/** Plus petit ordre libre dans 1..8, ou null si l'équipe est complète. */
export function prochainOrdreLibre(ordresUtilises: number[]): number | null {
  const pris = new Set(ordresUtilises);
  for (let o = 1; o <= TAILLE_MAX_EQUIPE; o += 1) {
    if (!pris.has(o)) return o;
  }
  return null;
}

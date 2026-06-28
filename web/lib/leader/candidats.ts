/**
 * Tranche 4 (coach) — filtre catégorie d'âge des grimpeurs proposés (doc 04 §3).
 * Port fidèle de GrimpeurQuerySet.enfants/adolescents (core/models.py) :
 *   - enfants (catégorie 1) : âge 8..13 ans ;
 *   - sinon (ado 2 / mixte 3) : âge 13..19 ans (repli legacy).
 * Le filtre n'est appliqué que côté coach (l'admin n'est pas restreint).
 */

const ENFANTS = 1;

/** Bornes d'année de naissance (incluses) pour la catégorie d'une rencontre. */
export function bornesAnneeNaissance(
  categorie: number,
  saison: number,
): { min: number; max: number } {
  const [ageMin, ageMax] = categorie === ENFANTS ? [8, 13] : [13, 19];
  return { min: saison - ageMax, max: saison - ageMin };
}

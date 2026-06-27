/**
 * Libellés FR des énumérations (codes identiques à Django / au schéma SQL).
 * Cf. doc 01. Les codes restent numériques en base (smallint) ; un refactor
 * ultérieur exposera des libellés (cf. mémoire projet « refactor-etat-libelle »).
 */

export const SEXE: Record<number, string> = { 1: "Femme", 2: "Homme", 3: "Mixte" };
export const CATEGORIE: Record<number, string> = {
  1: "Enfants",
  2: "Adolescents",
  3: "Mixte",
};
export const GENRE = SEXE; // voie.genre partage le même domaine (1 F, 2 H, 3 mixte)
export const TYPE_VOIE: Record<number, string> = {
  1: "Bloc",
  2: "Difficulté",
  3: "Vitesse",
};

export const SEXE_OPTIONS = [
  { value: 1, label: SEXE[1] },
  { value: 2, label: SEXE[2] },
];

export const GENRE_OPTIONS = [
  { value: 1, label: GENRE[1] },
  { value: 2, label: GENRE[2] },
  { value: 3, label: GENRE[3] },
];

export const CATEGORIE_OPTIONS = [
  { value: 1, label: CATEGORIE[1] },
  { value: 2, label: CATEGORIE[2] },
  { value: 3, label: CATEGORIE[3] },
];

export const TYPE_VOIE_OPTIONS = [
  { value: 1, label: TYPE_VOIE[1] },
  { value: 2, label: TYPE_VOIE[2] },
  { value: 3, label: TYPE_VOIE[3] },
];

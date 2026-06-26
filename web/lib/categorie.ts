/**
 * Catégorie d'âge d'affichage (U11..U21) à partir de l'année de naissance et de
 * la saison. Port fidèle de ranking.jsx (getCategorie). Cf. doc 08 §4.
 */
export function categorieAge(anneeNaissance: number, saison: number): string {
  const age = saison - anneeNaissance;
  if (age >= 8 && age <= 9) return "U11";
  if (age >= 10 && age <= 11) return "U13";
  if (age >= 12 && age <= 13) return "U15";
  if (age >= 14 && age <= 15) return "U17";
  if (age >= 16 && age <= 17) return "U19";
  if (age >= 18 && age <= 19) return "U21";
  return "Hors catégorie";
}

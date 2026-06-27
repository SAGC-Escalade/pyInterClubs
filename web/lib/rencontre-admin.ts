/**
 * Helpers d'administration des rencontres (doc 03 §3/§4).
 * La logique de scoring/lecture publique vit dans lib/rencontre.ts.
 */

/**
 * Saison par défaut à la création (admin/views.py:81) : l'année + 1 si l'on
 * est après août (la saison sportive bascule en septembre).
 */
export function defaultSaison(now: Date = new Date()): number {
  return now.getMonth() + 1 > 8 ? now.getFullYear() + 1 : now.getFullYear();
}

/** Date du jour au format ISO yyyy-mm-dd (valeur d'un <input type="date">). */
export function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Catégorie « enfants » : voies groupées par défaut (admin/views.py:84-85). */
export const CATEGORIE_ENFANTS = 1;

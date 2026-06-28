/**
 * Normalise une relation imbriquée PostgREST : selon le sens de la jointure,
 * supabase-js renvoie un objet OU un tableau. Ce helper ramène toujours à un
 * objet unique (ou null). Cf. lib/rencontre.ts pour le cas d'origine.
 */
export function unObjet<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

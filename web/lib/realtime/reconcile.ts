/**
 * Tranche 6 — Réconciliation optimiste du cache TanStack Query à partir d'un
 * payload de broadcast. Port pur de `updateCache` (api/react/observer.jsx),
 * conservant la sémantique ajout / remplacement par id / suppression
 * (`{deleted:{id}}`) et la fusion d'objet. Doc 07 §2/§5.
 */

export type RealtimePayload = {
  id?: number;
  deleted?: { id: number };
  [key: string]: unknown;
};

/**
 * Applique `payload` à `oldData` (tableau ou objet) et renvoie la nouvelle
 * valeur du cache. Fonction pure : ne mute jamais `oldData`.
 *
 * `keyOf` extrait la clé d'identité d'un élément (défaut : `.id`). Les lignes de
 * vue SQL utilisant parfois `equipe_id`/`score_id`, on peut fournir un accès
 * dédié ; le payload doit exposer la même clé (et `{deleted:{id}}` = cette clé).
 */
export function reconcileCache<T>(
  oldData: T[] | T | null,
  payload: RealtimePayload,
  keyOf: (x: T | RealtimePayload) => number | undefined = (x) =>
    (x as { id?: number }).id,
): T[] | T | null {
  if (Array.isArray(oldData)) {
    if (payload.deleted) {
      return oldData.filter((item) => keyOf(item) !== payload.deleted!.id);
    }
    const item = payload as unknown as T;
    const cle = keyOf(payload);
    if (oldData.some((o) => keyOf(o) === cle)) {
      return oldData.map((o) => (keyOf(o) === cle ? item : o));
    }
    return [...oldData, item];
  }

  if (oldData && !payload.deleted && keyOf(oldData) === keyOf(payload)) {
    return { ...oldData, ...(payload as unknown as Partial<T>) };
  }
  if (payload.deleted) {
    return null;
  }
  return oldData;
}

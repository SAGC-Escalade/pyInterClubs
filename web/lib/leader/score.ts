/**
 * Tranche 4 (coach) — verrou « started » d'un membre (doc 04 §4).
 * Port de ScoreSerializer.get_started (api/serializers.py) : un membre est
 * « démarré » dès qu'une performance de difficulté (type 2) a des points. On
 * fige alors l'affectation groupée des diffs (la rejouer casserait le score).
 */

const TYPE_DIFF = 2;

/** Vrai si au moins une performance de diff porte des points. */
export function estDemarre(
  perfs: { type: number | null; points: number | null }[],
): boolean {
  return perfs.some((p) => p.type === TYPE_DIFF && p.points !== null);
}

/**
 * Tranche 4 — logique pure du provisioning terrain (doc 03 §5/§6/§8, doc 10 §2).
 * L'orchestration I/O (création des utilisateurs Auth + lignes coach/juge) vit
 * dans les route handlers service_role ; ici on isole les décisions testables.
 */

export type ClubRef = { id: number; nom: string; ville: string };

/**
 * Clubs pour lesquels il faut créer un coach au démarrage. On exclut ceux qui
 * en ont déjà un (le démarrage est rejouable sans doublon).
 */
export function coachesAProvisionner(
  clubs: ClubRef[],
  coachsExistants: { club_id: number }[],
): ClubRef[] {
  const dejaProvisionnes = new Set(coachsExistants.map((c) => c.club_id));
  return clubs.filter((club) => !dejaProvisionnes.has(club.id));
}

/**
 * E-mail Auth synthétique dérivé du token. L'auth terrain est sans mot de passe
 * (login par QR) : on ne distribue jamais ces e-mails, ils servent uniquement de
 * clé d'identité Supabase Auth (doc 10 §2).
 */
export function identityEmail(role: "coach" | "juge", token: string): string {
  return `${token}@${role}.interclubs.local`;
}

/** Validation d'une affectation de juge (nom obligatoire, au moins une voie). */
export function validerAffectationJuge(
  nom: string,
  voieIds: number[],
):
  | { ok: true; nom: string; voieIds: number[] }
  | { ok: false; erreur: string } {
  const nomNet = nom.trim();
  if (!nomNet) return { ok: false, erreur: "Le nom du juge est obligatoire." };

  const ids = [...new Set(voieIds)];
  if (ids.length === 0) {
    return { ok: false, erreur: "Sélectionnez au moins une voie." };
  }
  return { ok: true, nom: nomNet, voieIds: ids };
}

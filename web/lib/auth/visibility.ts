import type { SessionTerrain } from "@/lib/auth/session";

/**
 * Tranche 8 — décision pure de visibilité en LECTURE, miroir des policies RLS
 * de la migration 0011 (doc 10 §3). Le SQL reste la garde réelle en base ; cette
 * fonction en est la source de vérité testable et sert au front pour éviter des
 * requêtes vouées à revenir vides.
 *
 * Décision T8 :
 *   - `config` / `coach` / `juge` : ADMIN seul. La table `config` porte des
 *     valeurs sensibles (Wi-Fi) et `coach`/`juge` portent les tokens QR : rien de
 *     tout cela ne doit être lisible par le terrain ni en anonyme.
 *   - Données de compétition : lisibles par TOUS (anonyme inclus) pour préserver
 *     le board public live et le classement global F/H fusionné (spec 08/10 §3).
 */

/** Tables réservées à l'admin en lecture (tokens + configuration sensible). */
export const TABLES_ADMIN_ONLY = ["config", "coach", "juge"] as const;

/** Tables de compétition lisibles publiquement (anon + authentifié). */
export const TABLES_PUBLIC_READ = [
  "club",
  "grimpeur",
  "voie",
  "rencontre",
  "rencontre_voie",
  "equipe",
  "score",
  "performance",
] as const;

export type TableAdminOnly = (typeof TABLES_ADMIN_ONLY)[number];
export type TablePublicRead = (typeof TABLES_PUBLIC_READ)[number];
export type TableCloisonnee = TableAdminOnly | TablePublicRead;

function estAdmin(session: SessionTerrain | null): boolean {
  return session?.role === "admin";
}

/** Indique si la session (ou l'anonyme `null`) peut lire la table donnée. */
export function canReadTable(
  session: SessionTerrain | null,
  table: TableCloisonnee,
): boolean {
  if ((TABLES_ADMIN_ONLY as readonly string[]).includes(table)) {
    return estAdmin(session);
  }
  return true;
}

/** Lecture de la configuration clé-valeur (Wi-Fi, DEFAULT_RENCONTRE…) : admin seul. */
export function canReadConfig(session: SessionTerrain | null): boolean {
  return canReadTable(session, "config");
}

/** Lecture des tokens QR (tables coach/juge) : admin seul. */
export function canReadTokens(session: SessionTerrain | null): boolean {
  return estAdmin(session);
}

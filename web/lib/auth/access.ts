import type { Role } from "@/lib/auth/session";

/**
 * Tranche 4 — garde de rôle (partie pure du middleware, doc 10 §2).
 * Restreint l'accès aux espaces protégés selon le rôle. Tout le reste
 * (résultats publics, page d'échange du QR) est ouvert.
 * Routage : coach -> /leader, juge -> /judge (cf. CLAUDE.md).
 */

// Préfixe d'espace -> rôles autorisés. L'admin a accès à tous les espaces.
const ESPACES_PROTEGES: { prefixe: string; roles: Role[] }[] = [
  { prefixe: "/admin", roles: ["admin"] },
  { prefixe: "/leader", roles: ["coach", "admin"] },
  { prefixe: "/judge", roles: ["juge", "admin"] },
];

function estDansEspace(pathname: string, prefixe: string): boolean {
  return pathname === prefixe || pathname.startsWith(`${prefixe}/`);
}

/** Indique si un rôle (ou l'anonyme `null`) peut accéder à un chemin. */
export function isAllowed(role: Role | null, pathname: string): boolean {
  const espace = ESPACES_PROTEGES.find((e) => estDansEspace(pathname, e.prefixe));
  if (!espace) return true; // chemin public
  return role !== null && espace.roles.includes(role);
}

/**
 * Traduction des erreurs Postgres/PostgREST en messages FR (doc 06 §5).
 * Centralise l'équivalent de handle_django_errors / api/exceptions.py.
 */

type PgError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
} | null;

export function frError(error: PgError, contexte?: string): string {
  if (!error) return "Une erreur est survenue.";

  switch (error.code) {
    // foreign_key_violation : suppression d'un élément référencé (FK restrict).
    case "23503":
      return "Suppression impossible : cet élément est protégé (il est utilisé ailleurs).";
    // unique_violation
    case "23505":
      return "Cet enregistrement existe déjà (doublon).";
    // check_violation
    case "23514":
      return "Valeur invalide : une contrainte de validation n'est pas respectée.";
    // not_null_violation
    case "23502":
      return "Un champ obligatoire est manquant.";
    // insufficient_privilege / RLS
    case "42501":
    case "PGRST301":
      return "Action non autorisée. Connectez-vous en tant qu'administrateur.";
    default:
      return (
        (contexte ? `${contexte} : ` : "") +
        (error.message || "Une erreur est survenue.")
      );
  }
}

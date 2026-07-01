"use client";

/** Bouton « Imprimer » (masqué à l'impression). Cf. doc 09 §4. */
export default function PrintButton() {
  return (
    <button
      type="button"
      className="btn btn-outline-secondary btn-sm no-print"
      onClick={() => window.print()}
      aria-label="Imprimer le rapport"
    >
      Imprimer
    </button>
  );
}

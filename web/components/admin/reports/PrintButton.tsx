"use client";

/** Bouton « Imprimer » (masqué à l'impression). Cf. doc 09 §4. */
export default function PrintButton() {
  return (
    <button className="btn btn-outline-secondary btn-sm no-print" onClick={() => window.print()}>
      Imprimer
    </button>
  );
}

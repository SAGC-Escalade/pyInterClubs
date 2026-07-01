/**
 * Tranche 8 — impression A4 fine (doc 08 §6, scénario T8-03). Génère la feuille
 * de style d'impression appliquée aux rapports : page A4 à marges 20 mm,
 * en-têtes de table répétés à chaque page, blocs insécables et masquage des
 * contrôles d'écran. Fonction pure pour rester testable (le CSS lui-même n'est
 * pas exécuté par Vitest, mais sa composition l'est).
 */

/** Marge d'impression par défaut, en millimètres (spec 08 §6). */
export const PRINT_MARGIN_MM = 20;

export type PrintCssOptions = {
  /** Marge de page en mm (défaut : {@link PRINT_MARGIN_MM}). */
  marginMm?: number;
};

/** Intentions d'impression mappées vers les classes utilitaires. */
export type PrintClassKind = "no-print" | "no-page-break" | "print-only";

/**
 * Construit le bloc `@media print` : format A4, marges, répétition des en-têtes
 * de table (`thead { display: table-header-group }`), blocs insécables
 * (`.no-page-break`) et bascule d'affichage des contrôles (`.no-print` /
 * `.print-only`).
 */
export function buildPrintCss(options: PrintCssOptions = {}): string {
  const margin = options.marginMm ?? PRINT_MARGIN_MM;
  return `@media print {
  @page {
    size: A4;
    margin: ${margin}mm;
  }

  /* Masque les contrôles d'écran, révèle les éléments réservés à l'impression. */
  .no-print { display: none !important; }
  .print-only { display: revert !important; }

  /* En-têtes de table répétés en haut de chaque page imprimée. */
  thead { display: table-header-group; }
  tfoot { display: table-footer-group; }

  /* Évite de couper un bloc (équipe, colonne) au milieu d'une page. */
  .no-page-break { break-inside: avoid; page-break-inside: avoid; }
  tr, img { break-inside: avoid; page-break-inside: avoid; }
}
`;
}

/** Renvoie la classe utilitaire d'impression correspondant à l'intention. */
export function printClass(kind: PrintClassKind): string {
  return kind;
}

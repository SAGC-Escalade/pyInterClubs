import { describe, it, expect } from "vitest";
import { PRINT_MARGIN_MM, buildPrintCss, printClass } from "@/lib/print/page";

/**
 * Tranche 8 — impression A4 fine (doc 08 §6, scénario T8-03). Le rendu final est
 * du CSS ; on isole ici la génération de la feuille d'impression pour vérifier
 * les règles clés : marges 20 mm, en-têtes de table répétés à chaque page,
 * pas de coupure au milieu d'un bloc, masquage des contrôles `no-print`.
 */

describe("PRINT_MARGIN_MM", () => {
  it("vaut 20 mm (spec 08 §6)", () => {
    expect(PRINT_MARGIN_MM).toBe(20);
  });
});

describe("buildPrintCss", () => {
  const css = buildPrintCss();

  it("déclare une page A4 avec marge 20 mm", () => {
    expect(css).toContain("@page");
    expect(css).toContain("size: A4");
    expect(css).toContain("margin: 20mm");
  });

  it("répète les en-têtes de table à chaque page", () => {
    expect(css).toContain("thead");
    expect(css).toContain("table-header-group");
  });

  it("évite les coupures au milieu d'un bloc no-page-break", () => {
    expect(css).toContain(".no-page-break");
    expect(css).toContain("break-inside: avoid");
  });

  it("masque les contrôles no-print et révèle print-only", () => {
    expect(css).toMatch(/\.no-print\s*\{[^}]*display:\s*none/);
    expect(css).toContain(".print-only");
  });

  it("accepte une marge personnalisée", () => {
    expect(buildPrintCss({ marginMm: 15 })).toContain("margin: 15mm");
  });

  it("n'émet ses règles que sous @media print", () => {
    expect(css.trim().startsWith("@media print")).toBe(true);
  });
});

describe("printClass", () => {
  it("mappe les intentions vers les classes utilitaires", () => {
    expect(printClass("no-print")).toBe("no-print");
    expect(printClass("no-page-break")).toBe("no-page-break");
    expect(printClass("print-only")).toBe("print-only");
  });
});

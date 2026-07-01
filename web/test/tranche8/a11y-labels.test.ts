import { describe, it, expect } from "vitest";
import {
  medalLabel,
  ariaLabelClassementRow,
  ariaLabelEquipe,
  ariaLabelPerfInput,
} from "@/lib/a11y/labels";

/**
 * Tranche 8 — accessibilité (doc 08 §6, scénario T8-04). Libellés `aria-*`
 * dérivés de façon pure pour les rangs, médailles, équipes et champs de saisie.
 * Testés pour garantir des intitulés stables et lisibles par lecteur d'écran.
 */

describe("medalLabel", () => {
  it("nomme les médailles du top 3", () => {
    expect(medalLabel(1)).toBe("Médaille d'or");
    expect(medalLabel(2)).toBe("Médaille d'argent");
    expect(medalLabel(3)).toBe("Médaille de bronze");
  });

  it("ne renvoie rien au-delà du podium", () => {
    expect(medalLabel(4)).toBeNull();
    expect(medalLabel(0)).toBeNull();
  });
});

describe("ariaLabelClassementRow", () => {
  it("annonce rang, identité et points", () => {
    expect(
      ariaLabelClassementRow({
        rang: 1,
        prenom: "Léa",
        nom: "Martin",
        points: 42,
      }),
    ).toBe("Rang 1, Léa Martin, 42 points, Médaille d'or");
  });

  it("omet la médaille hors podium et gère le singulier", () => {
    expect(
      ariaLabelClassementRow({
        rang: 5,
        prenom: "Tom",
        nom: "Roy",
        points: 1,
      }),
    ).toBe("Rang 5, Tom Roy, 1 point");
  });
});

describe("ariaLabelEquipe", () => {
  it("annonce le club, le numéro, les points et la validité", () => {
    expect(
      ariaLabelEquipe({
        clubNom: "CAF Bordeaux",
        numero: 2,
        points: 120,
        valide: true,
      }),
    ).toBe("Équipe CAF Bordeaux numéro 2, 120 points, validée");
  });

  it("signale une équipe incomplète", () => {
    expect(
      ariaLabelEquipe({
        clubNom: "US Cagouille",
        numero: 1,
        points: 0,
        valide: false,
      }),
    ).toBe("Équipe US Cagouille numéro 1, 0 point, en cours");
  });
});

describe("ariaLabelPerfInput", () => {
  it("décrit la saisie selon la voie et le grimpeur", () => {
    expect(
      ariaLabelPerfInput({ voieNom: "M1", grimpeur: "Léa Martin" }),
    ).toBe("Performance de Léa Martin sur la voie M1");
  });
});

import { describe, it, expect } from "vitest";
import {
  defaultSaison,
  todayIso,
  CATEGORIE_ENFANTS,
} from "@/lib/rencontre-admin";

/**
 * Tranche 3 — helpers d'administration des rencontres (valeurs par défaut du
 * formulaire de création). Port de admin/views.py.
 */
describe("defaultSaison", () => {
  it("renvoie l'année courante de janvier à août", () => {
    // La saison bascule en septembre : jusqu'en août, on reste sur l'année N.
    expect(defaultSaison(new Date(2025, 0, 15))).toBe(2025); // janvier
    expect(defaultSaison(new Date(2025, 7, 31))).toBe(2025); // août (mois 7)
  });

  it("renvoie l'année + 1 de septembre à décembre", () => {
    expect(defaultSaison(new Date(2025, 8, 1))).toBe(2026); // septembre (mois 8)
    expect(defaultSaison(new Date(2025, 11, 31))).toBe(2026); // décembre
  });
});

describe("todayIso", () => {
  it("formate la date locale en yyyy-mm-dd avec zéros de tête", () => {
    expect(todayIso(new Date(2025, 2, 5))).toBe("2025-03-05");
  });

  it("gère le dernier jour de l'année", () => {
    expect(todayIso(new Date(2025, 11, 31))).toBe("2025-12-31");
  });
});

describe("CATEGORIE_ENFANTS", () => {
  it("vaut 1 (voies groupées par défaut)", () => {
    expect(CATEGORIE_ENFANTS).toBe(1);
  });
});

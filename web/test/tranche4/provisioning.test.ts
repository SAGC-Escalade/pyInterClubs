import { describe, it, expect } from "vitest";
import {
  coachesAProvisionner,
  identityEmail,
  validerAffectationJuge,
  type ClubRef,
} from "@/lib/auth/provisioning";

/**
 * Tranche 4 — logique pure de provisioning (doc 03 §5/§6/§8, doc 10 §2).
 * Au démarrage : un coach par club (idempotent). Affectation juge : nom + voies.
 */
const CLUBS: ClubRef[] = [
  { id: 1, nom: "CAF Paris", ville: "Paris" },
  { id: 2, nom: "CAF Lyon", ville: "Lyon" },
  { id: 3, nom: "CAF Nice", ville: "Nice" },
];

describe("coachesAProvisionner", () => {
  it("retourne tous les clubs quand aucun coach n'existe", () => {
    expect(coachesAProvisionner(CLUBS, [])).toEqual(CLUBS);
  });

  it("ignore les clubs déjà provisionnés (idempotence du démarrage)", () => {
    const existants = [{ club_id: 1 }, { club_id: 3 }];
    expect(coachesAProvisionner(CLUBS, existants)).toEqual([
      { id: 2, nom: "CAF Lyon", ville: "Lyon" },
    ]);
  });

  it("retourne une liste vide si tous les clubs ont un coach", () => {
    const existants = [{ club_id: 1 }, { club_id: 2 }, { club_id: 3 }];
    expect(coachesAProvisionner(CLUBS, existants)).toEqual([]);
  });
});

describe("identityEmail", () => {
  it("dérive un e-mail synthétique coach à partir du token", () => {
    expect(identityEmail("coach", "abc-123")).toBe(
      "abc-123@coach.interclubs.local",
    );
  });

  it("dérive un e-mail synthétique juge à partir du token", () => {
    expect(identityEmail("juge", "abc-123")).toBe(
      "abc-123@juge.interclubs.local",
    );
  });
});

describe("validerAffectationJuge", () => {
  it("accepte un nom et des voies valides (nom trimé, voies dédupliquées)", () => {
    expect(validerAffectationJuge("  Dupont  ", [11, 12, 11])).toEqual({
      ok: true,
      nom: "Dupont",
      voieIds: [11, 12],
    });
  });

  it("refuse un nom vide", () => {
    const r = validerAffectationJuge("   ", [11]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erreur).toMatch(/nom/i);
  });

  it("refuse une sélection de voies vide", () => {
    const r = validerAffectationJuge("Dupont", []);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erreur).toMatch(/voie/i);
  });
});

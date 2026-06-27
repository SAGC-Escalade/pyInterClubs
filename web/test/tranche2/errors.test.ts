import { describe, it, expect } from "vitest";
import { frError } from "@/lib/errors";

/**
 * Tranche 2 — traduction FR des erreurs Postgres/PostgREST (équivalent de
 * api/exceptions.py). Chaque code SQLSTATE -> message utilisateur.
 */
describe("frError", () => {
  it("null -> message générique", () => {
    expect(frError(null)).toBe("Une erreur est survenue.");
  });

  it("23503 (FK) -> suppression protégée", () => {
    expect(frError({ code: "23503" })).toMatch(/protégé/);
  });

  it("23505 (unique) -> doublon", () => {
    expect(frError({ code: "23505" })).toMatch(/doublon/i);
  });

  it("23514 (check) -> contrainte de validation", () => {
    expect(frError({ code: "23514" })).toMatch(/contrainte de validation/);
  });

  it("23502 (not null) -> champ obligatoire", () => {
    expect(frError({ code: "23502" })).toMatch(/obligatoire/);
  });

  it.each(["42501", "PGRST301"])("%s (RLS) -> action non autorisée", (code) => {
    expect(frError({ code })).toMatch(/administrateur/i);
  });

  it("code inconnu -> message brut, préfixé par le contexte", () => {
    expect(frError({ code: "XX000", message: "boom" }, "Création club")).toBe(
      "Création club : boom",
    );
  });

  it("code inconnu sans contexte -> message brut", () => {
    expect(frError({ code: "XX000", message: "boom" })).toBe("boom");
  });

  it("code inconnu sans message -> message générique", () => {
    expect(frError({ code: "XX000" })).toBe("Une erreur est survenue.");
  });
});

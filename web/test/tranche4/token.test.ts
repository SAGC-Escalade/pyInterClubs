import { describe, it, expect } from "vitest";
import {
  qrExchangeUrl,
  isValidTokenFormat,
  generateToken,
} from "@/lib/auth/token";

/**
 * Tranche 4 — helpers purs token/QR (doc 10 §2). Le token est le secret encodé
 * dans le QR, échangé via /auth/club?token=… On abandonne le MD5 déterministe
 * Django (devinable) au profit d'un token aléatoire (UUID v4).
 */
describe("qrExchangeUrl", () => {
  it("construit l'URL d'échange à partir d'une base et d'un token", () => {
    expect(qrExchangeUrl("a1b2c3", "https://interclubs.fr")).toBe(
      "https://interclubs.fr/auth/club?token=a1b2c3",
    );
  });

  it("ignore un slash final dans la base (pas de // en trop)", () => {
    expect(qrExchangeUrl("a1b2c3", "https://interclubs.fr/")).toBe(
      "https://interclubs.fr/auth/club?token=a1b2c3",
    );
  });

  it("encode les caractères spéciaux du token", () => {
    expect(qrExchangeUrl("a b/c", "https://x.fr")).toBe(
      "https://x.fr/auth/club?token=a%20b%2Fc",
    );
  });
});

describe("isValidTokenFormat", () => {
  it("accepte un UUID v4", () => {
    expect(isValidTokenFormat("9f1c4d2e-7a3b-4c1d-8e2f-0123456789ab")).toBe(true);
  });

  it.each([
    ["chaîne vide", ""],
    ["trop court", "abc"],
    ["espaces", "9f1c4d2e 7a3b 4c1d 8e2f 0123456789ab"],
    // L'ancien token MD5 (32 hex sans tirets) est explicitement rejeté (doc 10 §2).
    ["MD5 déterministe", "d41d8cd98f00b204e9800998ecf8427e"],
  ])("rejette un token invalide (%s)", (_libelle, valeur) => {
    expect(isValidTokenFormat(valeur)).toBe(false);
  });

  it("rejette une valeur non-chaîne", () => {
    expect(isValidTokenFormat(null)).toBe(false);
    expect(isValidTokenFormat(123)).toBe(false);
    expect(isValidTokenFormat(undefined)).toBe(false);
  });
});

describe("generateToken", () => {
  it("produit un token au format valide", () => {
    expect(isValidTokenFormat(generateToken())).toBe(true);
  });

  it("produit deux tokens distincts (aléatoire, non devinable)", () => {
    expect(generateToken()).not.toBe(generateToken());
  });
});

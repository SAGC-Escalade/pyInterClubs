import { describe, it, expect } from "vitest";
import {
  canReadTable,
  canReadConfig,
  canReadTokens,
  TABLES_ADMIN_ONLY,
  TABLES_PUBLIC_READ,
} from "@/lib/auth/visibility";
import type { SessionTerrain } from "@/lib/auth/session";

/**
 * Tranche 8 — durcissement RLS lecture (doc 10 §3). Le SQL (policies) n'est pas
 * couvrable par Vitest ; cette fonction pure est la SOURCE DE VÉRITÉ de la
 * décision de visibilité en lecture, miroir exact des policies de la migration
 * 0011 :
 *   - config / coach / juge : admin seul (les tokens et le Wi-Fi ne fuient pas) ;
 *   - données de compétition : lisibles par tous (anon inclus) pour le board
 *     public live et le classement global (cf. décision T8, spec 10 §3).
 */

const ADMIN: SessionTerrain = { role: "admin", userId: "a" };
const COACH: SessionTerrain = {
  role: "coach",
  userId: "c",
  rencontre: 1,
  club: 2,
};
const JUGE: SessionTerrain = {
  role: "juge",
  userId: "j",
  rencontre: 1,
  voies: [10, 11],
};
const ANON = null;

describe("canReadTable (Tranche 8 — cloisonnement de lecture)", () => {
  it("l'admin lit toutes les tables", () => {
    for (const t of [...TABLES_ADMIN_ONLY, ...TABLES_PUBLIC_READ]) {
      expect(canReadTable(ADMIN, t)).toBe(true);
    }
  });

  it.each(TABLES_ADMIN_ONLY)(
    "table sensible %s : refusée au coach, au juge et à l'anonyme",
    (table) => {
      expect(canReadTable(COACH, table)).toBe(false);
      expect(canReadTable(JUGE, table)).toBe(false);
      expect(canReadTable(ANON, table)).toBe(false);
    },
  );

  it.each(TABLES_PUBLIC_READ)(
    "table de compétition %s : lisible par coach, juge et anonyme",
    (table) => {
      expect(canReadTable(COACH, table)).toBe(true);
      expect(canReadTable(JUGE, table)).toBe(true);
      expect(canReadTable(ANON, table)).toBe(true);
    },
  );

  it("config, coach et juge sont bien classées sensibles", () => {
    expect(TABLES_ADMIN_ONLY).toEqual(
      expect.arrayContaining(["config", "coach", "juge"]),
    );
  });

  it("aucune table n'est à la fois sensible et publique", () => {
    const intersection = TABLES_PUBLIC_READ.filter((t) =>
      (TABLES_ADMIN_ONLY as readonly string[]).includes(t),
    );
    expect(intersection).toEqual([]);
  });
});

describe("canReadConfig / canReadTokens", () => {
  it("config : admin seul", () => {
    expect(canReadConfig(ADMIN)).toBe(true);
    expect(canReadConfig(COACH)).toBe(false);
    expect(canReadConfig(JUGE)).toBe(false);
    expect(canReadConfig(ANON)).toBe(false);
  });

  it("tokens (coach/juge) : admin seul", () => {
    expect(canReadTokens(ADMIN)).toBe(true);
    expect(canReadTokens(COACH)).toBe(false);
    expect(canReadTokens(JUGE)).toBe(false);
    expect(canReadTokens(ANON)).toBe(false);
  });
});

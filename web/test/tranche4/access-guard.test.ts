import { describe, it, expect } from "vitest";
import { isAllowed } from "@/lib/auth/access";

/**
 * Tranche 4 — garde de rôle (partie pure du middleware, doc 10 §2). Le
 * middleware résout le rôle puis restreint l'accès aux espaces /admin, /leader
 * et /judge. On extrait la règle role × chemin pour la tester sans NextRequest.
 * Convention de routage : coach -> /leader, juge -> /judge (cf. CLAUDE.md).
 */
describe("isAllowed (Tranche 4 — cloisonnement des espaces)", () => {
  it.each([
    // espace admin : réservé à l'admin
    ["admin", "/admin", true],
    ["coach", "/admin", false],
    ["juge", "/admin", false],
    [null, "/admin", false],
    // espace coach : coach (et admin)
    ["coach", "/leader", true],
    ["coach", "/leader/equipe/3", true],
    ["admin", "/leader", true],
    ["juge", "/leader", false],
    [null, "/leader", false],
    // espace juge : juge (et admin)
    ["juge", "/judge", true],
    ["juge", "/judge/voie/11", true],
    ["admin", "/judge", true],
    ["coach", "/judge", false],
    [null, "/judge", false],
  ] as const)(
    "role=%s sur %s -> %s",
    (role, pathname, attendu) => {
      expect(isAllowed(role, pathname)).toBe(attendu);
    },
  );

  it.each([
    "/",
    "/auth/club",
    "/results",
  ])("laisse passer tout le monde sur un chemin public (%s)", (pathname) => {
    expect(isAllowed(null, pathname)).toBe(true);
    expect(isAllowed("coach", pathname)).toBe(true);
    expect(isAllowed("juge", pathname)).toBe(true);
    expect(isAllowed("admin", pathname)).toBe(true);
  });
});

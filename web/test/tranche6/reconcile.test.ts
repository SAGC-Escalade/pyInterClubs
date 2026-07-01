import { describe, it, expect } from "vitest";
import { reconcileCache } from "@/lib/realtime/reconcile";

/**
 * Tranche 6 — Réconciliation optimiste du cache (port pur de updateCache,
 * api/react/observer.jsx:245-260). Doc 07 §2/§5.
 */
describe("reconcileCache — cache tableau", () => {
  it("ajoute un élément absent", () => {
    const out = reconcileCache([{ id: 1, points: 10 }], { id: 2, points: 20 });
    expect(out).toEqual([
      { id: 1, points: 10 },
      { id: 2, points: 20 },
    ]);
  });

  it("remplace un élément existant (fusion par id)", () => {
    const out = reconcileCache(
      [
        { id: 1, points: 10 },
        { id: 2, points: 20 },
      ],
      { id: 1, points: 15 },
    );
    expect(out).toEqual([
      { id: 1, points: 15 },
      { id: 2, points: 20 },
    ]);
  });

  it("retire un élément via {deleted:{id}}", () => {
    const out = reconcileCache(
      [
        { id: 1, points: 10 },
        { id: 2, points: 20 },
      ],
      { deleted: { id: 1 } },
    );
    expect(out).toEqual([{ id: 2, points: 20 }]);
  });

  it("laisse la liste inchangée si l'id supprimé est absent", () => {
    const liste = [{ id: 1, points: 10 }];
    expect(reconcileCache(liste, { deleted: { id: 9 } })).toEqual(liste);
  });
});

describe("reconcileCache — cache objet", () => {
  it("fusionne un objet de même id", () => {
    const out = reconcileCache(
      { id: 1, points: 10, valide: false },
      { id: 1, points: 15 },
    );
    expect(out).toEqual({ id: 1, points: 15, valide: false });
  });

  it("passe à null sur suppression", () => {
    expect(reconcileCache({ id: 1 }, { deleted: { id: 1 } })).toBeNull();
  });

  it("laisse inchangé un objet d'id différent", () => {
    const obj = { id: 1, points: 10 };
    expect(reconcileCache(obj, { id: 2, points: 20 })).toBe(obj);
  });

  it("renvoie oldData tel quel si null et pas de suppression", () => {
    expect(reconcileCache(null, { id: 1 })).toBeNull();
  });
});

describe("reconcileCache — clé personnalisée (equipe_id)", () => {
  const keyOf = (x: { equipe_id?: number } | { deleted?: { id: number } }) =>
    (x as { equipe_id?: number }).equipe_id;

  it("remplace une ligne de vue par equipe_id", () => {
    const out = reconcileCache(
      [
        { equipe_id: 1, points: 10, valide: false },
        { equipe_id: 2, points: 20, valide: true },
      ],
      { equipe_id: 1, points: 15, valide: true },
      keyOf,
    );
    expect(out).toEqual([
      { equipe_id: 1, points: 15, valide: true },
      { equipe_id: 2, points: 20, valide: true },
    ]);
  });

  it("retire une ligne via {deleted:{id}} (= equipe_id)", () => {
    const out = reconcileCache(
      [{ equipe_id: 1 }, { equipe_id: 2 }],
      { deleted: { id: 2 } },
      keyOf,
    );
    expect(out).toEqual([{ equipe_id: 1 }]);
  });
});

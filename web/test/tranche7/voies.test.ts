import { describe, it, expect } from "vitest";
import {
  genererVoiesReference,
  zonesEnTableau,
  voiesVersSql,
  type VoieSeed,
} from "@/lib/import/voies";

/**
 * Tranche 7 — barème de voies de référence (port de admin/management/commands/addVoies.py,
 * doc 11 §6). Les `zones` sont normalisées au format tableau ORDONNÉ [{label, points}]
 * (doc 02 §6, doc 11 §2) : l'ordre porte l'index `etat`, il ne doit jamais bouger.
 */
describe("zonesEnTableau", () => {
  it("convertit un dict ordonné en tableau [{label, points}] en préservant l'ordre", () => {
    expect(
      zonesEnTableau({ "A réaliser": null, Chute: 0, Top: 3 }),
    ).toEqual([
      { label: "A réaliser", points: null },
      { label: "Chute", points: 0 },
      { label: "Top", points: 3 },
    ]);
  });

  it("conserve les points littéraux ({rank}) des voies de vitesse", () => {
    expect(
      zonesEnTableau({ "{rank}>5": "11-{rank}//5", "{rank}<=5": "15-{rank}" }),
    ).toEqual([
      { label: "{rank}>5", points: "11-{rank}//5" },
      { label: "{rank}<=5", points: "15-{rank}" },
    ]);
  });
});

describe("genererVoiesReference", () => {
  const voies = genererVoiesReference();
  const par = (pred: (v: VoieSeed) => boolean) => voies.filter(pred);

  it("génère les 40 voies du barème (2+3 vitesse, 4 blocs, 16+15 diffs)", () => {
    expect(voies).toHaveLength(40);
  });

  it("répartit vitesse/bloc/diff par type", () => {
    expect(par((v) => v.type === 3)).toHaveLength(5); // vitesse
    expect(par((v) => v.type === 1)).toHaveLength(4); // bloc
    expect(par((v) => v.type === 2)).toHaveLength(31); // diff (16 enfants + 15 ado)
  });

  it("répartit 20 voies enfants / 20 voies adolescents", () => {
    expect(par((v) => v.categorie === 1)).toHaveLength(20);
    expect(par((v) => v.categorie === 2)).toHaveLength(20);
  });

  it("toutes les voies du barème sont actives et commencent par « A réaliser » (null)", () => {
    for (const v of voies) {
      expect(v.actif).toBe(true);
      expect(v.zones[0]).toEqual({ label: "A réaliser", points: null });
    }
  });

  it("vitesse enfants : une voie par genre (femme=1, homme=2), catégorie enfants", () => {
    const vf = voies.find(
      (v) => v.type === 3 && v.categorie === 1 && v.genre === 1,
    )!;
    expect(vf.niveau).toBe("Femme");
    expect(vf.zones).toContainEqual({ label: "{rank}<=5", points: "15-{rank}" });
    expect(vf.zones).toContainEqual({ label: "{rank}>44", points: 2 });
    const vh = voies.find(
      (v) => v.type === 3 && v.categorie === 1 && v.genre === 2,
    )!;
    expect(vh.niveau).toBe("Homme");
  });

  it("vitesse ado : trois voies (femme/homme/mixte), la mixte a niveau « 2025 »", () => {
    const ados = par((v) => v.type === 3 && v.categorie === 2);
    expect(ados).toHaveLength(3);
    const mixte = ados.find((v) => v.genre === 3)!;
    expect(mixte.niveau).toBe("2025");
    expect(mixte.zones).toContainEqual({ label: "{rank}<=50", points: "60-{rank}" });
  });

  it("diff enfants M1 : niveau 4c, Top = 0 (barème doc 02)", () => {
    const m1 = voies.find((v) => v.nom === "M1" && v.categorie === 1)!;
    expect(m1.niveau).toBe("4c");
    expect(m1.zones).toEqual([
      { label: "A réaliser", points: null },
      { label: "Chute", points: 0 },
      { label: "Top", points: 0 },
    ]);
  });

  it("diff enfants T3 (premier) : Zone = 4, Top = 7", () => {
    const t3 = voies.find((v) => v.nom === "T3" && v.categorie === 1)!;
    expect(t3.zones).toEqual([
      { label: "A réaliser", points: null },
      { label: "Chute", points: 0 },
      { label: "Zone", points: 4 },
      { label: "Top", points: 7 },
    ]);
  });

  it("diff ado T10 : Zone 2 = 20, Zone 1 = 19, Top = 22 (ordre Zone2/Zone1/Top)", () => {
    const t10 = voies.find((v) => v.nom === "T10" && v.categorie === 2)!;
    expect(t10.zones).toEqual([
      { label: "A réaliser", points: null },
      { label: "Chute", points: 0 },
      { label: "Zone 2", points: 20 },
      { label: "Zone 1", points: 19 },
      { label: "Top", points: 22 },
    ]);
  });

  it("conserve les voies doublées (Cestas) : T3 enfants apparaît deux fois", () => {
    expect(par((v) => v.nom === "T3" && v.categorie === 1)).toHaveLength(2);
  });
});

describe("voiesVersSql", () => {
  const sql = voiesVersSql(genererVoiesReference());

  it("émet un INSERT dans public.voie", () => {
    expect(sql).toContain("insert into public.voie");
  });

  it("est rejouable : gardé par un « if not exists » (do $$)", () => {
    expect(sql).toContain("do $$");
    expect(sql).toContain("if not exists");
  });

  it("contient une ligne de valeurs par voie (40 tableaux de zones)", () => {
    const occurrences = sql.split('[{"label"').length - 1;
    expect(occurrences).toBe(40);
  });

  it("sérialise les zones au format tableau ordonné", () => {
    expect(sql).toContain(
      '[{"label":"A réaliser","points":null},{"label":"Chute","points":0},{"label":"Top","points":0}]',
    );
  });
});

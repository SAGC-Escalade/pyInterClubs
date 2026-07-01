import { describe, it, expect } from "vitest";
import {
  parseIdentite,
  getSexe,
  resoudreSexe,
  parseCsvGrimpeurs,
  resoudreConflit,
  planifierImport,
  type GrimpeurExistant,
  type RowGrimpeur,
} from "@/lib/import/climbers";

/**
 * Tranche 7 — import CSV des grimpeurs (port de importClimbers.py, doc 11 §5).
 * Logique de transformation/résolution en fonctions PURES (parse, sexe, conflits).
 * Codes sexe : 1 femme, 2 homme, 3 mixte (schéma SQL, cf. lib/constants).
 */
describe("parseIdentite (MAJUSCULES = nom)", () => {
  it("sépare nom et prénom simples", () => {
    expect(parseIdentite("DUPONT Emma")).toEqual({ nom: "DUPONT", prenom: "Emma" });
  });

  it("gère un nom composé en plusieurs mots", () => {
    expect(parseIdentite("DE LA CROIX Marie")).toEqual({
      nom: "DE LA CROIX",
      prenom: "Marie",
    });
  });

  it("gère un prénom composé", () => {
    expect(parseIdentite("MARTIN Jean Pierre")).toEqual({
      nom: "MARTIN",
      prenom: "Jean Pierre",
    });
  });

  it("laisse un prénom à trait d'union du côté prénom", () => {
    expect(parseIdentite("BERNARD Jean-Baptiste")).toEqual({
      nom: "BERNARD",
      prenom: "Jean-Baptiste",
    });
  });
});

describe("getSexe (liste de prénoms portée)", () => {
  it("reconnaît un prénom masculin", () => {
    expect(getSexe("Jules")).toBe(2);
  });

  it("reconnaît un prénom féminin", () => {
    expect(getSexe("Emma")).toBe(1);
  });

  it("normalise les accents (Rémi → homme, Zoé → femme)", () => {
    expect(getSexe("Rémi")).toBe(2);
    expect(getSexe("Zoé")).toBe(1);
  });

  it("retourne mixte (3) pour un prénom inconnu", () => {
    expect(getSexe("Xyzzy")).toBe(3);
  });
});

describe("resoudreSexe (colonne explicite, sinon liste)", () => {
  it("utilise la colonne explicite quand elle est présente (F/M)", () => {
    expect(resoudreSexe({ prenom: "Xyzzy", sexeExplicite: "F" })).toBe(1);
    expect(resoudreSexe({ prenom: "Xyzzy", sexeExplicite: "M" })).toBe(2);
  });

  it("retombe sur la liste de prénoms si la colonne est absente/vide", () => {
    expect(resoudreSexe({ prenom: "Emma", sexeExplicite: "" })).toBe(1);
    expect(resoudreSexe({ prenom: "Jules" })).toBe(2);
  });

  it("retombe sur mixte si ni colonne exploitable ni prénom connu", () => {
    expect(resoudreSexe({ prenom: "Xyzzy", sexeExplicite: "?" })).toBe(3);
  });
});

describe("parseCsvGrimpeurs", () => {
  it("parse un CSV FFME (structure, licence, identité, date)", () => {
    const csv = [
      "Structure,Numéro de licence,Nom complet,Date de naissance",
      "CAF BORDEAUX,111,DUPONT Emma,12/05/2015",
      "PYRÉNÉA ESCALADE,222,MARTIN Lucas,03/08/2014",
    ].join("\n");
    expect(parseCsvGrimpeurs(csv)).toEqual([
      {
        club: "Caf Bordeaux",
        licence: 111,
        nom: "DUPONT",
        prenom: "Emma",
        anneeNaissance: 2015,
        sexe: 1,
      },
      {
        club: "Pyrénéa Escalade",
        licence: 222,
        nom: "MARTIN",
        prenom: "Lucas",
        anneeNaissance: 2014,
        sexe: 2,
      },
    ]);
  });

  it("exploite une colonne Sexe explicite quand elle est mappée", () => {
    const csv = [
      "Structure,Numéro de licence,Nom complet,Date de naissance,Sexe",
      "CAF BORDEAUX,999,DOE Xyzzy,01/01/2015,F",
    ].join("\n");
    const rows = parseCsvGrimpeurs(csv, {
      club: "Structure",
      licence: "Numéro de licence",
      identite: "Nom complet",
      dateNaissance: "Date de naissance",
      sexe: "Sexe",
    });
    expect(rows[0].sexe).toBe(1);
  });
});

describe("resoudreConflit (6 cas Django)", () => {
  const base: GrimpeurExistant = {
    id: 1,
    nom: "DUPONT",
    prenom: "Emma",
    anneeNaissance: 2015,
    licence: 111,
    club: "Caf Bordeaux",
  };
  const cand = (o: Partial<RowGrimpeur> = {}): RowGrimpeur => ({
    club: "Caf Bordeaux",
    licence: 111,
    nom: "DUPONT",
    prenom: "Emma",
    anneeNaissance: 2015,
    sexe: 1,
    ...o,
  });

  it("grimpeur identique → skip", () => {
    expect(resoudreConflit(cand(), [base], { force: false })).toEqual({
      type: "skip",
    });
  });

  it("nouveau grimpeur → create", () => {
    const action = resoudreConflit(
      cand({ nom: "NOUVEAU", prenom: "Paul", anneeNaissance: 2013, licence: 900 }),
      [base],
      { force: false },
    );
    expect(action.type).toBe("create");
  });

  it("changement de club → move (indépendant de --force)", () => {
    const action = resoudreConflit(cand({ club: "Pyrénéa Escalade" }), [base], {
      force: false,
    });
    expect(action).toMatchObject({
      type: "move",
      id: 1,
      changements: { club: "Pyrénéa Escalade" },
    });
  });

  it("licence changée (même club) : ignore sans --force, update avec --force", () => {
    const c = cand({ licence: 222 });
    expect(resoudreConflit(c, [base], { force: false })).toMatchObject({
      type: "ignore",
      motif: "licence",
    });
    expect(resoudreConflit(c, [base], { force: true })).toMatchObject({
      type: "update",
      id: 1,
      motif: "licence",
      changements: { licence: 222 },
    });
  });

  it("licence ET club changés : ignore sans --force, update avec --force", () => {
    const c = cand({ licence: 222, club: "Pyrénéa Escalade" });
    expect(resoudreConflit(c, [base], { force: false })).toMatchObject({
      type: "ignore",
      motif: "licence-et-club",
    });
    expect(resoudreConflit(c, [base], { force: true })).toMatchObject({
      type: "update",
      id: 1,
      motif: "licence-et-club",
      changements: { licence: 222, club: "Pyrénéa Escalade" },
    });
  });

  it("licence déjà attribuée à un autre grimpeur : ignore sans --force, update avec --force", () => {
    const c = cand({ nom: "MARTIN", prenom: "Lucas", anneeNaissance: 2014 });
    expect(resoudreConflit(c, [base], { force: false })).toMatchObject({
      type: "ignore",
      motif: "licence-dupliquee",
    });
    expect(resoudreConflit(c, [base], { force: true })).toMatchObject({
      type: "update",
      id: 1,
      motif: "licence-dupliquee",
      changements: { nom: "MARTIN", prenom: "Lucas", anneeNaissance: 2014 },
    });
  });
});

describe("planifierImport (plan + compteurs, dry-run = plan seul)", () => {
  const base: GrimpeurExistant = {
    id: 1,
    nom: "DUPONT",
    prenom: "Emma",
    anneeNaissance: 2015,
    licence: 111,
    club: "Caf Bordeaux",
  };
  const row = (o: Partial<RowGrimpeur>): RowGrimpeur => ({
    club: "Caf Bordeaux",
    licence: 111,
    nom: "DUPONT",
    prenom: "Emma",
    anneeNaissance: 2015,
    sexe: 1,
    ...o,
  });

  it("compte existants / créés (filles, garçons) / clubs nouveaux", () => {
    const rows = [
      row({}), // identique -> skip
      row({ nom: "PETIT", prenom: "Hugo", anneeNaissance: 2013, licence: 200, club: "Nouveau Club", sexe: 2 }), // create garçon + club neuf
      row({ nom: "ROBERT", prenom: "Léa", anneeNaissance: 2016, licence: 201, sexe: 1 }), // create fille
      row({ nom: "DOE", prenom: "Xyzzy", anneeNaissance: 2015, licence: 202, sexe: 3 }), // create mixte -> prénom inconnu
    ];
    const { plan, resume } = planifierImport(rows, [base], { force: false });
    expect(plan).toHaveLength(4);
    expect(resume.existed).toBe(1);
    expect(resume.created).toBe(3);
    expect(resume.garcons).toBe(1);
    expect(resume.filles).toBe(1);
    expect(resume.clubs).toContain("Nouveau Club");
    expect(resume.prenomsInconnus).toContain("xyzzy");
  });

  it("comptabilise les déplacements et les ignorés (conflits non forcés)", () => {
    const rows = [
      row({ club: "Autre Club" }), // move
      row({ licence: 222 }), // ignore (licence)
    ];
    const { resume } = planifierImport(rows, [base], { force: false });
    expect(resume.moved).toBe(1);
    expect(resume.ignored).toBe(1);
    expect(resume.updated).toBe(0);
  });

  it("applique les mises à jour de conflit avec --force", () => {
    const rows = [row({ licence: 222 })];
    const { resume } = planifierImport(rows, [base], { force: true });
    expect(resume.updated).toBe(1);
    expect(resume.ignored).toBe(0);
  });
});

/**
 * Tranche 5 — Rapports : accès aux données (lecture seule, côté serveur).
 * Assemble les entités d'une rencontre (ou d'une saison) pour les rapports
 * imprimables. Cf. doc 09 et admin/views.py (RencontreReportViewMixin).
 */

import { createClient } from "@/lib/supabase/server";
import { intervalVersSecondes } from "@/lib/juge/temps";
import { getRencontreEntete, type RencontreEntete } from "@/lib/rencontre";
import {
  classer,
  agregerGrimpeurs,
  agregerEquipes,
  grouperParClub,
  type Classe,
} from "@/lib/reports/ranking";
import { construireStats, ordonnerVoies, type VoieStat, type Stats } from "@/lib/reports/stats";
import { CATEGORIE } from "@/lib/constants";

/** PostgREST renvoie tantôt un objet, tantôt un tableau pour une relation. */
function one<T>(x: unknown): T | null {
  if (x == null) return null;
  return (Array.isArray(x) ? (x[0] ?? null) : x) as T | null;
}

export type Grimpeur = {
  id: number;
  nom: string;
  prenom: string;
  sexe: number;
  annee_naissance: number;
};

export type PerfCell = {
  voie_id: number | null;
  type: number | null;
  etat: number | null;
  etatLabel: string | null;
  points: number | null;
  temps_sec: number | null;
};

export type MembreRapport = {
  score_id: number;
  ordre: number;
  grimpeur: Grimpeur;
  club_nom: string;
  club_preteur_nom: string | null;
  points: number;
  valide: boolean;
  perfs: PerfCell[];
};

export type EquipeRapport = {
  id: number;
  numero: number;
  club_nom: string;
  points: number;
  valide: boolean;
  membres: MembreRapport[];
};

export type RapportRencontre = {
  entete: RencontreEntete;
  voies: VoieStat[];
  equipes: EquipeRapport[];
  classements: { titre: string; scores: Classe<MembreRapport>[] }[];
  inscrits: { club: string; grimpeurs: Grimpeur[] }[];
  stats: Stats;
};

/** Agrège toutes les données d'une rencontre pour ses rapports. */
export async function getRapportRencontre(
  id: number,
): Promise<RapportRencontre | null> {
  const supabase = createClient();

  const entete = await getRencontreEntete(String(id));
  if (!entete) return null;

  const { data: voiesRows } = await supabase
    .from("rencontre_voie")
    .select("voie:voie_id(id, nom, type, zones)")
    .eq("rencontre_id", id);

  const voies: VoieStat[] = ordonnerVoies(
    (voiesRows ?? [])
      .map((r) => one<VoieStat>((r as { voie: unknown }).voie))
      .filter((v): v is VoieStat => v != null),
  );
  const voieParId = new Map(voies.map((v) => [v.id, v]));

  const { data: rencontre } = await supabase
    .from("rencontre")
    .select("nb_bloc, nb_diff, nb_vitesse")
    .eq("id", id)
    .maybeSingle();
  const nbBloc = (rencontre?.nb_bloc as number) ?? 0;
  const nbDiff = (rencontre?.nb_diff as number) ?? 0;
  const nbVitesse = (rencontre?.nb_vitesse as number) ?? 0;

  const { data: equipesRows } = await supabase
    .from("equipe")
    .select(
      `id, numero,
       club:club_id(nom),
       membres:score(
         id, ordre,
         grimpeur:grimpeur_id(id, nom, prenom, sexe, annee_naissance, club:club_id(nom)),
         club_preteur:club_preteur_id(nom),
         performances:performance(voie_id, etat, points, temps)
       )`,
    )
    .eq("rencontre_id", id);

  const equipes: EquipeRapport[] = (equipesRows ?? []).map((eq) => {
    const clubEq = one<{ nom: string }>((eq as { club: unknown }).club);
    const membres: MembreRapport[] = ((eq as { membres: unknown[] }).membres ?? [])
      .map((m) => {
        const mm = m as {
          id: number;
          ordre: number;
          grimpeur: unknown;
          club_preteur: unknown;
          performances: unknown[];
        };
        const g = one<Grimpeur & { club: unknown }>(mm.grimpeur);
        const clubGrimpeur = one<{ nom: string }>(g?.club);
        const preteur = one<{ nom: string }>(mm.club_preteur);

        let nbB = 0;
        let nbD = 0;
        let nbV = 0;
        const perfs: PerfCell[] = (mm.performances ?? []).map((p) => {
          const pp = p as {
            voie_id: number | null;
            etat: number | null;
            points: number | null;
            temps: string | null;
          };
          const voie = pp.voie_id != null ? voieParId.get(pp.voie_id) : undefined;
          const type = voie?.type ?? null;
          if (pp.points != null) {
            if (type === 1) nbB++;
            else if (type === 2) nbD++;
            else if (type === 3) nbV++;
          }
          return {
            voie_id: pp.voie_id,
            type,
            etat: pp.etat,
            etatLabel:
              voie && pp.etat != null ? voie.zones[pp.etat]?.label ?? null : null,
            points: pp.points,
            temps_sec: intervalVersSecondes(pp.temps),
          };
        });
        const points = perfs.reduce((s, p) => s + (p.points ?? 0), 0);
        const valide = nbB === nbBloc && nbD === nbDiff && nbV === nbVitesse;

        return {
          score_id: mm.id,
          ordre: mm.ordre,
          grimpeur: {
            id: g?.id ?? 0,
            nom: g?.nom ?? "",
            prenom: g?.prenom ?? "",
            sexe: g?.sexe ?? 0,
            annee_naissance: g?.annee_naissance ?? 0,
          },
          club_nom: clubGrimpeur?.nom ?? "",
          club_preteur_nom: preteur?.nom ?? null,
          points,
          valide,
          perfs,
        };
      })
      .sort((a, b) => a.ordre - b.ordre);

    const points = membres.reduce((s, m) => s + m.points, 0);
    return {
      id: (eq as { id: number }).id,
      numero: (eq as { numero: number }).numero,
      club_nom: clubEq?.nom ?? "",
      points,
      valide: membres.length > 0 && membres.every((m) => m.valide),
      membres,
    };
  });
  equipes.sort((a, b) => b.points - a.points);

  const tousMembres = equipes.flatMap((e) => e.membres);

  const parSexe = (sexe: number) =>
    classer(
      tousMembres.filter((m) => m.grimpeur.sexe === sexe),
      (m) => m.points,
    );
  const classements = [
    { titre: "Femmes", scores: parSexe(1) },
    { titre: "Hommes", scores: parSexe(2) },
  ];

  const inscrits = grouperParClub(
    tousMembres.map((m) => ({
      id: m.grimpeur.id,
      nom: m.grimpeur.nom,
      prenom: m.grimpeur.prenom,
      club_nom: m.club_nom,
      grimpeur: m.grimpeur,
    })),
  ).map((g) => ({ club: g.club, grimpeurs: g.grimpeurs.map((x) => x.grimpeur) }));

  const stats = construireStats(
    voies,
    tousMembres.flatMap((m) =>
      m.perfs.map((p) => ({
        voie_id: p.voie_id,
        etat: p.etat,
        points: p.points,
        temps_sec: p.temps_sec,
        sexe: m.grimpeur.sexe,
      })),
    ),
  );

  return { entete, voies, equipes, classements, inscrits, stats };
}

// --------------------------------------------------------------------
// Rapports de saison (multi-rencontres)
// --------------------------------------------------------------------

export type ClassementSaison = {
  titre: string;
  lignes: Classe<{ nom: string; club: string; points: number }>[];
};

/** Classement individuel de saison par catégorie (enfants/ado) × sexe. */
export async function getRapportSaisonIndividuel(
  saison: number,
): Promise<ClassementSaison[]> {
  const supabase = createClient();

  const { data: rencontres } = await supabase
    .from("rencontre")
    .select("id, categorie")
    .eq("saison", saison);
  const catParRencontre = new Map(
    (rencontres ?? []).map((r) => [r.id as number, r.categorie as number]),
  );

  const { data: rows } = await supabase
    .from("v_classement")
    .select("rencontre_id, grimpeur_id, nom, prenom, sexe, club_nom, points")
    .eq("saison", saison);

  const classements: ClassementSaison[] = [];
  for (const categorie of [1, 2]) {
    const dansCat = (rows ?? []).filter(
      (r) => catParRencontre.get(r.rencontre_id as number) === categorie,
    );
    for (const [sexe, label] of [
      [2, "hommes"],
      [1, "femmes"],
    ] as const) {
      const scores = agregerGrimpeurs(
        dansCat
          .filter((r) => r.sexe === sexe)
          .map((r) => ({
            grimpeur_id: r.grimpeur_id as number,
            grimpeur: {
              nom: `${r.nom} ${r.prenom}`,
              club: (r.club_nom as string) ?? "",
            },
            points: (r.points as number) ?? 0,
          })),
      );
      classements.push({
        titre: `${CATEGORIE[categorie]} ${label}`,
        lignes: scores.map((s) => ({
          nom: s.grimpeur.nom,
          club: s.grimpeur.club,
          points: s.points,
          rang: s.rang,
        })),
      });
    }
  }
  return classements;
}

/** Classement équipes de saison par catégorie (regroupé par club + numéro). */
export async function getRapportSaisonEquipes(
  saison: number,
): Promise<ClassementSaison[]> {
  const supabase = createClient();

  const { data: rencontres } = await supabase
    .from("rencontre")
    .select("id, categorie")
    .eq("saison", saison);
  const rencontreIds = (rencontres ?? []).map((r) => r.id as number);
  const catParRencontre = new Map(
    (rencontres ?? []).map((r) => [r.id as number, r.categorie as number]),
  );

  const { data: clubs } = await supabase.from("club").select("id, nom");
  const nomClub = new Map((clubs ?? []).map((c) => [c.id as number, c.nom as string]));

  const { data: rows } = await supabase
    .from("v_equipe_points")
    .select("rencontre_id, club_id, numero, points")
    .in("rencontre_id", rencontreIds.length ? rencontreIds : [-1]);

  const classements: ClassementSaison[] = [];
  for (const categorie of [1, 2]) {
    const dansCat = (rows ?? []).filter(
      (r) => catParRencontre.get(r.rencontre_id as number) === categorie,
    );
    const scores = agregerEquipes(
      dansCat.map((r) => ({
        club_id: r.club_id as number,
        club: { nom: nomClub.get(r.club_id as number) ?? "" },
        numero: r.numero as number,
        points: (r.points as number) ?? 0,
      })),
    );
    classements.push({
      titre: CATEGORIE[categorie],
      lignes: scores.map((s) => ({
        nom: `Équipe ${s.numero}`,
        club: s.club.nom,
        points: s.points,
        rang: s.rang,
      })),
    });
  }
  return classements;
}

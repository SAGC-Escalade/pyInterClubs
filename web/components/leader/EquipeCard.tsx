"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { frError } from "@/lib/errors";
import { unObjet } from "@/lib/supabase/embed";
import { categorieAge } from "@/lib/categorie";
import { TAILLE_MAX_EQUIPE } from "@/lib/leader/ordre";
import { estDemarre } from "@/lib/leader/score";
import Autocomplete from "@/components/Autocomplete";

export type Candidat = {
  id: number;
  nom: string;
  prenom: string;
  annee_naissance: number;
  sexe: number;
};
export type VoieDiff = { id: number; nom: string; genre: number; type: number };

type Grimpeur = {
  nom: string;
  prenom: string;
  sexe: number;
  annee_naissance: number;
};
type Voie = { nom: string; type: number };
type Perf = {
  id: number;
  voie_id: number | null;
  etat: number | null;
  temps: string | null;
  points: number | null;
  voie: Voie | Voie[] | null;
};
type Membre = {
  id: number;
  ordre: number;
  club_preteur_id: number | null;
  grimpeur: Grimpeur | Grimpeur[] | null;
  performances: Perf[];
};
type EquipeRow = {
  equipe_id: number;
  numero: number;
  points: number;
  nb_membres: number;
  valide: boolean;
};

const SYMBOLE_SEXE: Record<number, string> = { 1: "♀", 2: "♂" };

/** Regroupe les performances par type (diff = type 2 ou voie non encore affectée). */
function grouper(perfs: Perf[]) {
  const t = (p: Perf) => unObjet(p.voie)?.type ?? (p.voie_id === null ? 2 : 0);
  return {
    blocs: perfs.filter((p) => t(p) === 1),
    diffs: perfs.filter((p) => t(p) === 2),
    vitesses: perfs.filter((p) => t(p) === 3),
  };
}

export default function EquipeCard({
  equipe,
  saison,
  voiesGroupees,
  diffVoies,
  clubs,
  candidats,
  onDelete,
}: {
  equipe: EquipeRow;
  saison: number;
  voiesGroupees: boolean;
  diffVoies: VoieDiff[];
  clubs: { value: number; label: string }[];
  candidats: Candidat[];
  onDelete: () => void;
}) {
  const supabase = createClient();
  const qc = useQueryClient();
  const invalider = () => qc.invalidateQueries({ queryKey: ["leader"] });

  const { data: membres = [] } = useQuery({
    queryKey: ["leader", "membres", equipe.equipe_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("score")
        .select(
          "id, ordre, club_preteur_id, grimpeur:grimpeur_id(nom, prenom, sexe, annee_naissance), performances:performance(id, voie_id, etat, temps, points, voie:voie_id(nom, type))",
        )
        .eq("equipe_id", equipe.equipe_id)
        .order("ordre");
      if (error) throw error;
      return data as Membre[];
    },
  });

  const { data: pointsParScore = {} } = useQuery({
    queryKey: ["leader", "points", equipe.equipe_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_score_points")
        .select("score_id, points, valide")
        .eq("equipe_id", equipe.equipe_id);
      if (error) throw error;
      const map: Record<number, { points: number; valide: boolean }> = {};
      for (const r of data as { score_id: number; points: number; valide: boolean }[]) {
        map[r.score_id] = { points: r.points, valide: r.valide };
      }
      return map;
    },
  });

  const inscrire = useMutation({
    mutationFn: async (grimpeurId: number) => {
      const { error } = await supabase.rpc("fn_inscrire_grimpeur", {
        p_equipe_id: equipe.equipe_id,
        p_grimpeur_id: grimpeurId,
      });
      if (error) throw error;
    },
    onSuccess: invalider,
  });

  const deplacer = useMutation({
    mutationFn: async ({ id, sens }: { id: number; sens: "up" | "down" }) => {
      const { error } = await supabase.rpc("fn_score_ordre", {
        p_score_id: id,
        p_sens: sens,
      });
      if (error) throw error;
    },
    onSuccess: invalider,
  });

  const grouper2 = useMutation({
    mutationFn: async ({ id, voieId }: { id: number; voieId: number }) => {
      const { error } = await supabase.rpc("fn_score_groupe", {
        p_score_id: id,
        p_voie_id: voieId,
      });
      if (error) throw error;
    },
    onSuccess: invalider,
  });

  const definirPreteur = useMutation({
    mutationFn: async ({ id, clubId }: { id: number; clubId: number | null }) => {
      const { error } = await supabase
        .from("score")
        .update({ club_preteur_id: clubId })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalider,
  });

  const retirer = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("score").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalider,
  });

  const erreur =
    inscrire.error ||
    deplacer.error ||
    grouper2.error ||
    definirPreteur.error ||
    retirer.error;

  const complete = membres.length >= TAILLE_MAX_EQUIPE;
  const [reglages, setReglages] = useState<number | null>(null);

  return (
    <div className="card mb-3">
      <div className="card-header d-flex align-items-center justify-content-between">
        <span className="fw-semibold">
          Équipe n°{equipe.numero}
          {equipe.valide && <span className="badge bg-success ms-2">complète</span>}
        </span>
        <span className="d-flex align-items-center gap-2">
          <span className="badge bg-primary">{equipe.points} pts</span>
          <button className="btn btn-sm btn-outline-danger" onClick={onDelete}>
            Supprimer l&apos;équipe
          </button>
        </span>
      </div>

      <ul className="list-group list-group-flush">
        {erreur && (
          <li className="list-group-item">
            <div className="alert alert-danger py-2 mb-0" role="alert">
              {frError(erreur as { code?: string; message?: string })}
            </div>
          </li>
        )}

        {membres.map((m, i) => {
          const g = unObjet(m.grimpeur);
          const stats = pointsParScore[m.id];
          const groupes = grouper(m.performances);
          const demarre = estDemarre(
            m.performances.map((p) => ({
              type: unObjet(p.voie)?.type ?? null,
              points: p.points,
            })),
          );
          const voiesPreteur = clubs;
          const diffsPourSexe = diffVoies.filter(
            (v) => g && (v.genre === g.sexe || v.genre === 3),
          );
          return (
            <li className="list-group-item" key={m.id}>
              <div className="d-flex align-items-center justify-content-between">
                <span>
                  <span className="text-muted me-2">{m.ordre}.</span>
                  {g?.nom} {g?.prenom}{" "}
                  {g && <span title="sexe">{SYMBOLE_SEXE[g.sexe]}</span>}
                  {g && (
                    <small className="text-muted ms-2">
                      {categorieAge(g.annee_naissance, saison)}
                    </small>
                  )}
                  {m.club_preteur_id && (
                    <span className="badge bg-warning text-dark ms-2">prêté</span>
                  )}
                  {stats?.valide && (
                    <span className="badge bg-success ms-2">validé</span>
                  )}
                </span>
                <span className="d-flex align-items-center gap-1">
                  <span className="badge bg-light text-dark">
                    {stats?.points ?? 0} pts
                  </span>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    title="Monter"
                    disabled={i === 0 || deplacer.isPending}
                    onClick={() => deplacer.mutate({ id: m.id, sens: "up" })}
                  >
                    ↑
                  </button>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    title="Descendre"
                    disabled={i === membres.length - 1 || deplacer.isPending}
                    onClick={() => deplacer.mutate({ id: m.id, sens: "down" })}
                  >
                    ↓
                  </button>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setReglages(reglages === m.id ? null : m.id)}
                  >
                    Réglages
                  </button>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => {
                      if (confirm(`Retirer ${g?.nom} ${g?.prenom} ?`)) retirer.mutate(m.id);
                    }}
                  >
                    Retirer
                  </button>
                </span>
              </div>

              {/* Performances (lecture seule côté coach ; le juge les saisit). */}
              <div className="row g-2 mt-1 small">
                <PerfGroupe titre="Blocs" perfs={groupes.blocs} />
                <PerfGroupe titre="Diffs" perfs={groupes.diffs} />
                <PerfGroupe titre="Vitesse" perfs={groupes.vitesses} />
              </div>

              {reglages === m.id && (
                <div className="row g-2 mt-2 align-items-end">
                  <div className="col-12 col-md-5">
                    <label className="form-label small mb-0">Club prêteur</label>
                    <Autocomplete
                      options={voiesPreteur}
                      value={m.club_preteur_id}
                      onChange={(clubId) =>
                        definirPreteur.mutate({ id: m.id, clubId })
                      }
                      placeholder="Aucun (club de l'équipe)"
                    />
                  </div>
                  {voiesGroupees && (
                    <div className="col-12 col-md-5">
                      <label className="form-label small mb-0">
                        Groupe de diffs (voie de départ)
                      </label>
                      <select
                        className="form-select"
                        defaultValue=""
                        disabled={demarre}
                        title={
                          demarre
                            ? "Verrouillé : le grimpeur a déjà des points en difficulté"
                            : undefined
                        }
                        onChange={(e) => {
                          const voieId = Number(e.target.value);
                          if (voieId) grouper2.mutate({ id: m.id, voieId });
                        }}
                      >
                        <option value="">Choisir…</option>
                        {diffsPourSexe.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.nom}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}

        {membres.length === 0 && (
          <li className="list-group-item text-muted">Aucun grimpeur inscrit.</li>
        )}

        {/* Ajout d'un membre (masqué si l'équipe est complète). */}
        {!complete && (
          <li className="list-group-item">
            <label className="form-label small mb-1">Inscrire un grimpeur</label>
            <Autocomplete
              options={candidats.map((c) => ({
                value: c.id,
                label: `${c.nom} ${c.prenom}`,
              }))}
              value={null}
              onChange={(id) => {
                if (id != null) inscrire.mutate(id);
              }}
              placeholder="Rechercher un grimpeur du club…"
            />
          </li>
        )}
      </ul>
    </div>
  );
}

function PerfGroupe({ titre, perfs }: { titre: string; perfs: Perf[] }) {
  if (perfs.length === 0) return null;
  return (
    <div className="col-auto">
      <span className="text-muted">{titre} :</span>{" "}
      {perfs.map((p) => {
        const voie = unObjet(p.voie);
        return (
          <span key={p.id} className="badge bg-light text-dark border me-1">
            {voie?.nom ?? "à affecter"}
            {p.points != null && ` · ${p.points}`}
          </span>
        );
      })}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { frError } from "@/lib/errors";
import { SEXE, SEXE_OPTIONS } from "@/lib/constants";
import Autocomplete from "@/components/Autocomplete";

type Grimpeur = {
  id: number;
  nom: string;
  prenom: string;
  annee_naissance: number;
  sexe: number;
  licence: number;
  club_id: number;
  club: { nom: string } | { nom: string }[] | null;
};

type Draft = {
  id: number | null;
  nom: string;
  prenom: string;
  annee_naissance: string;
  sexe: number;
  licence: string;
  club_id: number | null;
};

const EMPTY: Draft = {
  id: null,
  nom: "",
  prenom: "",
  annee_naissance: "",
  sexe: 1,
  licence: "",
  club_id: null,
};

const clubNom = (g: Grimpeur) =>
  Array.isArray(g.club) ? g.club[0]?.nom : g.club?.nom;

export default function GrimpeursManager() {
  const supabase = createClient();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const { data: clubs = [] } = useQuery({
    queryKey: ["admin", "clubs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("club")
        .select("id, nom")
        .order("nom");
      if (error) throw error;
      return data as { id: number; nom: string }[];
    },
  });

  const clubOptions = useMemo(
    () => clubs.map((c) => ({ value: c.id, label: c.nom })),
    [clubs],
  );

  const { data: grimpeurs = [], isLoading } = useQuery({
    queryKey: ["admin", "grimpeurs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grimpeur")
        .select(
          "id, nom, prenom, annee_naissance, sexe, licence, club_id, club:club_id(nom)",
        )
        .order("nom")
        .order("prenom");
      if (error) throw error;
      return data as Grimpeur[];
    },
  });

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      if (d.club_id === null) throw { message: "Sélectionnez un club." };
      const payload = {
        nom: d.nom.trim(),
        prenom: d.prenom.trim(),
        annee_naissance: Number(d.annee_naissance),
        sexe: d.sexe,
        licence: d.licence ? Number(d.licence) : 0,
        club_id: d.club_id,
      };
      const res = d.id
        ? await supabase.from("grimpeur").update(payload).eq("id", d.id)
        : await supabase.from("grimpeur").insert(payload);
      if (res.error) throw res.error;
    },
    onSuccess: () => {
      setDraft(EMPTY);
      setError(null);
      qc.invalidateQueries({ queryKey: ["admin", "grimpeurs"] });
    },
    onError: (e: { code?: string; message?: string }) => setError(frError(e)),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("grimpeur").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "grimpeurs"] }),
    onError: (e: { code?: string; message?: string }) => setError(frError(e)),
  });

  return (
    <>
      <h1 className="h4 mb-4">Grimpeurs</h1>

      {error && (
        <div className="alert alert-danger py-2" role="alert">
          {error}
        </div>
      )}

      <form
        className="row g-2 align-items-end mb-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(draft);
        }}
      >
        <div className="col-6 col-md">
          <label className="form-label">Nom</label>
          <input
            className="form-control"
            value={draft.nom}
            onChange={(e) => setDraft({ ...draft, nom: e.target.value })}
            required
            maxLength={50}
          />
        </div>
        <div className="col-6 col-md">
          <label className="form-label">Prénom</label>
          <input
            className="form-control"
            value={draft.prenom}
            onChange={(e) => setDraft({ ...draft, prenom: e.target.value })}
            required
            maxLength={50}
          />
        </div>
        <div className="col-4 col-md-2">
          <label className="form-label">Année</label>
          <input
            type="number"
            className="form-control"
            value={draft.annee_naissance}
            onChange={(e) =>
              setDraft({ ...draft, annee_naissance: e.target.value })
            }
            required
            min={1950}
            max={2050}
          />
        </div>
        <div className="col-4 col-md-2">
          <label className="form-label">Sexe</label>
          <select
            className="form-select"
            value={draft.sexe}
            onChange={(e) => setDraft({ ...draft, sexe: Number(e.target.value) })}
          >
            {SEXE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="col-4 col-md-2">
          <label className="form-label">Licence</label>
          <input
            type="number"
            className="form-control"
            value={draft.licence}
            onChange={(e) => setDraft({ ...draft, licence: e.target.value })}
          />
        </div>
        <div className="col-12 col-md-3">
          <label className="form-label">Club</label>
          <Autocomplete
            options={clubOptions}
            value={draft.club_id}
            onChange={(v) => setDraft({ ...draft, club_id: v })}
            placeholder="Rechercher un club…"
            required
          />
        </div>
        <div className="col-12">
          <button className="btn btn-primary" type="submit" disabled={save.isPending}>
            {draft.id ? "Mettre à jour" : "Ajouter"}
          </button>
          {draft.id && (
            <button
              type="button"
              className="btn btn-link"
              onClick={() => {
                setDraft(EMPTY);
                setError(null);
              }}
            >
              Annuler
            </button>
          )}
        </div>
      </form>

      {isLoading ? (
        <p className="text-muted">Chargement…</p>
      ) : (
        <table className="table table-hover align-middle">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Prénom</th>
              <th>Année</th>
              <th>Sexe</th>
              <th>Club</th>
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {grimpeurs.map((g) => (
              <tr key={g.id}>
                <td>{g.nom}</td>
                <td>{g.prenom}</td>
                <td>{g.annee_naissance}</td>
                <td>{SEXE[g.sexe]}</td>
                <td>{clubNom(g)}</td>
                <td className="text-end">
                  <button
                    className="btn btn-sm btn-outline-secondary me-2"
                    onClick={() => {
                      setError(null);
                      setDraft({
                        id: g.id,
                        nom: g.nom,
                        prenom: g.prenom,
                        annee_naissance: String(g.annee_naissance),
                        sexe: g.sexe,
                        licence: g.licence ? String(g.licence) : "",
                        club_id: g.club_id,
                      });
                    }}
                  >
                    Éditer
                  </button>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => {
                      if (confirm(`Supprimer ${g.nom} ${g.prenom} ?`)) remove.mutate(g.id);
                    }}
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
            {grimpeurs.length === 0 && (
              <tr>
                <td colSpan={6} className="text-muted">
                  Aucun grimpeur.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </>
  );
}

"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { frError } from "@/lib/errors";
import {
  CATEGORIE,
  CATEGORIE_OPTIONS,
  GENRE,
  GENRE_OPTIONS,
  TYPE_VOIE,
  TYPE_VOIE_OPTIONS,
} from "@/lib/constants";
import ZonesEditor, { type Zone } from "@/components/admin/ZonesEditor";

type Voie = {
  id: number;
  nom: string;
  niveau: string;
  categorie: number;
  genre: number;
  type: number;
  zones: Zone[];
  actif: boolean;
};

type Draft = {
  id: number | null;
  nom: string;
  niveau: string;
  categorie: number;
  genre: number;
  type: number;
  zones: Zone[];
  actif: boolean;
};

const EMPTY: Draft = {
  id: null,
  nom: "",
  niveau: "",
  categorie: 1,
  genre: 3,
  type: 1,
  zones: [{ label: "A réaliser", points: null }],
  actif: false,
};

export default function VoiesManager() {
  const supabase = createClient();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const { data: voies = [], isLoading } = useQuery({
    queryKey: ["admin", "voies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("voie")
        .select("id, nom, niveau, categorie, genre, type, zones, actif")
        .order("type")
        .order("nom");
      if (error) throw error;
      return data as Voie[];
    },
  });

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      if (d.zones.length === 0) throw { message: "Le barème doit comporter au moins une zone." };
      const payload = {
        nom: d.nom.trim(),
        niveau: d.niveau.trim(),
        categorie: d.categorie,
        genre: d.genre,
        type: d.type,
        zones: d.zones,
        actif: d.actif,
      };
      const res = d.id
        ? await supabase.from("voie").update(payload).eq("id", d.id)
        : await supabase.from("voie").insert(payload);
      if (res.error) throw res.error;
    },
    onSuccess: () => {
      setDraft(EMPTY);
      setError(null);
      qc.invalidateQueries({ queryKey: ["admin", "voies"] });
    },
    onError: (e: { code?: string; message?: string }) => setError(frError(e)),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("voie").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "voies"] }),
    onError: (e: { code?: string; message?: string }) => setError(frError(e)),
  });

  return (
    <>
      <h1 className="h4 mb-4">Voies</h1>

      {error && (
        <div className="alert alert-danger py-2" role="alert">
          {error}
        </div>
      )}

      <form
        className="card card-body mb-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(draft);
        }}
      >
        <div className="row g-2 mb-2">
          <div className="col-6 col-md-3">
            <label className="form-label">Nom</label>
            <input
              className="form-control"
              value={draft.nom}
              onChange={(e) => setDraft({ ...draft, nom: e.target.value })}
              required
              maxLength={15}
            />
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label">Niveau</label>
            <input
              className="form-control"
              value={draft.niveau}
              onChange={(e) => setDraft({ ...draft, niveau: e.target.value })}
              required
              maxLength={5}
            />
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label">Type</label>
            <select
              className="form-select"
              value={draft.type}
              onChange={(e) => setDraft({ ...draft, type: Number(e.target.value) })}
            >
              {TYPE_VOIE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label">Catégorie</label>
            <select
              className="form-select"
              value={draft.categorie}
              onChange={(e) =>
                setDraft({ ...draft, categorie: Number(e.target.value) })
              }
            >
              {CATEGORIE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label">Genre</label>
            <select
              className="form-select"
              value={draft.genre}
              onChange={(e) => setDraft({ ...draft, genre: Number(e.target.value) })}
            >
              {GENRE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-1 d-flex align-items-end">
            <div className="form-check">
              <input
                id="voie-actif"
                type="checkbox"
                className="form-check-input"
                checked={draft.actif}
                onChange={(e) => setDraft({ ...draft, actif: e.target.checked })}
              />
              <label className="form-check-label" htmlFor="voie-actif">
                Actif
              </label>
            </div>
          </div>
        </div>

        <ZonesEditor
          zones={draft.zones}
          onChange={(zones) => setDraft({ ...draft, zones })}
        />

        <div className="mt-2">
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
              <th>Niveau</th>
              <th>Type</th>
              <th>Catégorie</th>
              <th>Genre</th>
              <th>Zones</th>
              <th>Actif</th>
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {voies.map((v) => (
              <tr key={v.id}>
                <td>{v.nom}</td>
                <td>{v.niveau}</td>
                <td>{TYPE_VOIE[v.type]}</td>
                <td>{CATEGORIE[v.categorie]}</td>
                <td>{GENRE[v.genre]}</td>
                <td>
                  <small className="text-muted">{v.zones?.length ?? 0} zones</small>
                </td>
                <td>
                  {v.actif ? (
                    <span className="badge bg-success">Oui</span>
                  ) : (
                    <span className="badge bg-secondary">Non</span>
                  )}
                </td>
                <td className="text-end">
                  <button
                    className="btn btn-sm btn-outline-secondary me-2"
                    onClick={() => {
                      setError(null);
                      setDraft({
                        id: v.id,
                        nom: v.nom,
                        niveau: v.niveau,
                        categorie: v.categorie,
                        genre: v.genre,
                        type: v.type,
                        zones: v.zones ?? [],
                        actif: v.actif,
                      });
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    Éditer
                  </button>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => {
                      if (confirm(`Supprimer la voie « ${v.nom} » ?`)) remove.mutate(v.id);
                    }}
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
            {voies.length === 0 && (
              <tr>
                <td colSpan={8} className="text-muted">
                  Aucune voie.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </>
  );
}

"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { frError } from "@/lib/errors";

type Club = { id: number; nom: string; ville: string };
type Draft = { id: number | null; nom: string; ville: string };

const EMPTY: Draft = { id: null, nom: "", ville: "" };

export default function ClubsManager() {
  const supabase = createClient();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const { data: clubs = [], isLoading } = useQuery({
    queryKey: ["admin", "clubs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("club")
        .select("id, nom, ville")
        .order("nom");
      if (error) throw error;
      return data as Club[];
    },
  });

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      const payload = { nom: d.nom.trim(), ville: d.ville.trim() };
      const res = d.id
        ? await supabase.from("club").update(payload).eq("id", d.id)
        : await supabase.from("club").insert(payload);
      if (res.error) throw res.error;
    },
    onSuccess: () => {
      setDraft(EMPTY);
      setError(null);
      qc.invalidateQueries({ queryKey: ["admin", "clubs"] });
    },
    onError: (e: { code?: string; message?: string }) => setError(frError(e)),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("club").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "clubs"] }),
    onError: (e: { code?: string; message?: string }) => setError(frError(e)),
  });

  return (
    <>
      <h1 className="h4 mb-4">Clubs</h1>

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
        <div className="col-12 col-sm">
          <label className="form-label" htmlFor="club-nom">
            Nom
          </label>
          <input
            id="club-nom"
            className="form-control"
            value={draft.nom}
            onChange={(e) => setDraft({ ...draft, nom: e.target.value })}
            required
            maxLength={50}
          />
        </div>
        <div className="col-12 col-sm">
          <label className="form-label" htmlFor="club-ville">
            Ville
          </label>
          <input
            id="club-ville"
            className="form-control"
            value={draft.ville}
            onChange={(e) => setDraft({ ...draft, ville: e.target.value })}
            required
            maxLength={50}
          />
        </div>
        <div className="col-auto">
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
              <th>Ville</th>
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clubs.map((c) => (
              <tr key={c.id}>
                <td>{c.nom}</td>
                <td>{c.ville}</td>
                <td className="text-end">
                  <button
                    className="btn btn-sm btn-outline-secondary me-2"
                    onClick={() => {
                      setError(null);
                      setDraft({ id: c.id, nom: c.nom, ville: c.ville });
                    }}
                  >
                    Éditer
                  </button>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => {
                      if (confirm(`Supprimer le club « ${c.nom} » ?`)) remove.mutate(c.id);
                    }}
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
            {clubs.length === 0 && (
              <tr>
                <td colSpan={3} className="text-muted">
                  Aucun club.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </>
  );
}

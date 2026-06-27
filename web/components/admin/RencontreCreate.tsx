"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { frError } from "@/lib/errors";
import {
  CATEGORIE_OPTIONS,
  GENRE,
  TYPE_VOIE,
  TYPE_VOIE_OPTIONS,
} from "@/lib/constants";
import Autocomplete from "@/components/Autocomplete";
import {
  CATEGORIE_ENFANTS,
  defaultSaison,
  todayIso,
} from "@/lib/rencontre-admin";

type Voie = {
  id: number;
  nom: string;
  niveau: string;
  categorie: number;
  genre: number;
  type: number;
};

type Tab = "params" | "voies" | "avances";

const TABS: { key: Tab; label: string }[] = [
  { key: "params", label: "Paramètres" },
  { key: "voies", label: "Voies" },
  { key: "avances", label: "Avancés" },
];

export default function RencontreCreate() {
  const supabase = createClient();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("params");
  const [error, setError] = useState<string | null>(null);

  // Onglet Paramètres
  const [saison, setSaison] = useState<number>(defaultSaison());
  const [date, setDate] = useState<string>(todayIso());
  const [clubId, setClubId] = useState<number | null>(null);
  const [categorie, setCategorie] = useState<number>(1);

  // Onglet Voies (sélection de RencontreVoie)
  const [voieIds, setVoieIds] = useState<Set<number>>(new Set());

  // Onglet Avancés
  const [nbBloc, setNbBloc] = useState(2);
  const [nbDiff, setNbDiff] = useState(3);
  const [nbVitesse, setNbVitesse] = useState(1);
  const [voiesReutilisables, setVoiesReutilisables] = useState(false);
  const [voiesGroupees, setVoiesGroupees] = useState(false);
  const [groupeesTouche, setGroupeesTouche] = useState(false);

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

  // Voies actives, filtrées par catégorie pour la sélection (admin/views.py:87).
  const { data: voies = [] } = useQuery({
    queryKey: ["admin", "voies-actives"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("voie")
        .select("id, nom, niveau, categorie, genre, type")
        .eq("actif", true)
        .order("type")
        .order("nom");
      if (error) throw error;
      return data as Voie[];
    },
  });
  const voiesCategorie = useMemo(
    () => voies.filter((v) => v.categorie === categorie),
    [voies, categorie],
  );

  // À chaque changement de catégorie : pré-remplir la sélection avec les voies
  // actives de la catégorie et basculer « groupées » par défaut (enfants).
  function onCategorieChange(cat: number) {
    setCategorie(cat);
    setVoieIds(new Set(voies.filter((v) => v.categorie === cat).map((v) => v.id)));
    if (!groupeesTouche) setVoiesGroupees(cat === CATEGORIE_ENFANTS);
  }

  function toggleVoie(id: number) {
    setVoieIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const create = useMutation({
    mutationFn: async () => {
      if (clubId === null) throw { message: "Sélectionnez le club hôte." };

      const { data: rencontre, error: errR } = await supabase
        .from("rencontre")
        .insert({
          saison,
          date,
          club_id: clubId,
          categorie,
          nb_bloc: nbBloc,
          nb_diff: nbDiff,
          nb_vitesse: nbVitesse,
          voies_reutilisables: voiesReutilisables,
          voies_groupees: voiesGroupees,
        })
        .select("id")
        .single();
      if (errR) throw errR;

      const ids = [...voieIds];
      if (ids.length > 0) {
        const { error: errV } = await supabase.from("rencontre_voie").insert(
          ids.map((voie_id) => ({
            rencontre_id: (rencontre as { id: number }).id,
            voie_id,
          })),
        );
        if (errV) throw errV;
      }
    },
    onSuccess: () => {
      router.push("/admin/rencontres");
      router.refresh();
    },
    onError: (e: { code?: string; message?: string }) => {
      setError(frError(e));
      setTab("params");
    },
  });

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h1 className="h4 mb-0">Créer une rencontre</h1>
      </div>

      {error && (
        <div className="alert alert-danger py-2" role="alert">
          {error}
        </div>
      )}

      <ul className="nav nav-tabs mb-3">
        {TABS.map((t) => (
          <li className="nav-item" key={t.key}>
            <button
              type="button"
              className={`nav-link ${tab === t.key ? "active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          </li>
        ))}
      </ul>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          create.mutate();
        }}
      >
        {/* ---------- Onglet Paramètres ---------- */}
        <div className={tab === "params" ? "" : "d-none"}>
          <div className="row g-3">
            <div className="col-6 col-md-3">
              <label className="form-label">Saison</label>
              <input
                type="number"
                className="form-control"
                value={saison}
                onChange={(e) => setSaison(Number(e.target.value))}
                required
              />
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label">Date</label>
              <input
                type="date"
                className="form-control"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label">Club hôte</label>
              <Autocomplete
                options={clubOptions}
                value={clubId}
                onChange={setClubId}
                placeholder="Rechercher un club…"
                required
              />
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label">Catégorie</label>
              <select
                className="form-select"
                value={categorie}
                onChange={(e) => onCategorieChange(Number(e.target.value))}
              >
                {CATEGORIE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ---------- Onglet Voies ---------- */}
        <div className={tab === "voies" ? "" : "d-none"}>
          <p className="text-muted">
            {voieIds.size} voie(s) sélectionnée(s) parmi les voies actives de la
            catégorie.
          </p>
          {voiesCategorie.length === 0 ? (
            <div className="alert alert-warning py-2">
              Aucune voie active pour cette catégorie. Activez des voies dans le
              référentiel.
            </div>
          ) : (
            <table className="table table-sm table-hover align-middle">
              <thead>
                <tr>
                  <th style={{ width: "3rem" }}></th>
                  <th>Nom</th>
                  <th>Niveau</th>
                  <th>Type</th>
                  <th>Genre</th>
                </tr>
              </thead>
              <tbody>
                {voiesCategorie.map((v) => (
                  <tr key={v.id} onClick={() => toggleVoie(v.id)} role="button">
                    <td>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={voieIds.has(v.id)}
                        onChange={() => toggleVoie(v.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td>{v.nom}</td>
                    <td>{v.niveau}</td>
                    <td>{TYPE_VOIE[v.type]}</td>
                    <td>{GENRE[v.genre]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ---------- Onglet Avancés ---------- */}
        <div className={tab === "avances" ? "" : "d-none"}>
          <div className="row g-3">
            <div className="col-4 col-md-2">
              <label className="form-label">Nb bloc</label>
              <input
                type="number"
                min={1}
                className="form-control"
                value={nbBloc}
                onChange={(e) => setNbBloc(Number(e.target.value))}
              />
            </div>
            <div className="col-4 col-md-2">
              <label className="form-label">Nb difficulté</label>
              <input
                type="number"
                min={1}
                className="form-control"
                value={nbDiff}
                onChange={(e) => setNbDiff(Number(e.target.value))}
              />
            </div>
            <div className="col-4 col-md-2">
              <label className="form-label">Nb vitesse</label>
              <input
                type="number"
                min={1}
                className="form-control"
                value={nbVitesse}
                onChange={(e) => setNbVitesse(Number(e.target.value))}
              />
            </div>
            <div className="col-12">
              <div className="form-check">
                <input
                  id="reutilisables"
                  type="checkbox"
                  className="form-check-input"
                  checked={voiesReutilisables}
                  onChange={(e) => setVoiesReutilisables(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="reutilisables">
                  Voies réutilisables (une voie peut servir à plusieurs équipes)
                </label>
              </div>
              <div className="form-check">
                <input
                  id="groupees"
                  type="checkbox"
                  className="form-check-input"
                  checked={voiesGroupees}
                  onChange={(e) => {
                    setGroupeesTouche(true);
                    setVoiesGroupees(e.target.checked);
                  }}
                />
                <label className="form-check-label" htmlFor="groupees">
                  Voies de difficulté groupées (affectation en mode groupé)
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 d-flex gap-2">
          <button
            className="btn btn-primary"
            type="submit"
            disabled={create.isPending}
          >
            {create.isPending ? "Création…" : "Créer la rencontre"}
          </button>
          <button
            type="button"
            className="btn btn-link"
            onClick={() => router.push("/admin/rencontres")}
          >
            Annuler
          </button>
        </div>
      </form>
    </>
  );
}

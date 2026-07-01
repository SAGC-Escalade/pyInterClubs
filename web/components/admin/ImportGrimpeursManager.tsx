"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { frError } from "@/lib/errors";
import { SEXE } from "@/lib/constants";
import {
  parseCsvGrimpeurs,
  planifierImport,
  MAPPING_FFME,
  type GrimpeurExistant,
  type PlanItem,
} from "@/lib/import/climbers";

/**
 * Tranche 7 — import CSV des grimpeurs (doc 11 §5, port de importClimbers.py).
 * Upload d'un CSV FFME → aperçu (dry-run : créés/màj/déplacés/ignorés) → Appliquer.
 * La logique de parse/résolution est pure (lib/import/climbers) ; ce composant
 * applique le plan via le client anon gardé par la RLS admin.
 */
type GrimpeurRow = {
  id: number;
  nom: string;
  prenom: string;
  annee_naissance: number;
  licence: number;
  club: { nom: string } | { nom: string }[] | null;
};

const clubNom = (g: GrimpeurRow) =>
  (Array.isArray(g.club) ? g.club[0]?.nom : g.club?.nom) ?? "";

const MOTIF_LABEL: Record<string, string> = {
  licence: "n° de licence changé",
  "licence-et-club": "licence + club changés",
  "licence-dupliquee": "licence déjà attribuée",
};

const ACTION_BADGE: Record<string, string> = {
  create: "bg-success",
  update: "bg-warning text-dark",
  move: "bg-info text-dark",
  skip: "bg-secondary",
  ignore: "bg-danger",
};

const ACTION_LABEL: Record<string, string> = {
  create: "Créer",
  update: "Mettre à jour",
  move: "Déplacer",
  skip: "Inchangé",
  ignore: "Ignoré",
};

export default function ImportGrimpeursManager() {
  const supabase = createClient();
  const qc = useQueryClient();
  const [csv, setCsv] = useState<string>("");
  const [fichier, setFichier] = useState<string>("");
  const [force, setForce] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState<string | null>(null);

  const { data: existants = [], isLoading } = useQuery({
    queryKey: ["admin", "grimpeurs", "import"],
    queryFn: async (): Promise<GrimpeurExistant[]> => {
      const { data, error } = await supabase
        .from("grimpeur")
        .select("id, nom, prenom, annee_naissance, licence, club:club_id(nom)");
      if (error) throw error;
      return (data as GrimpeurRow[]).map((g) => ({
        id: g.id,
        nom: g.nom,
        prenom: g.prenom,
        anneeNaissance: g.annee_naissance,
        licence: g.licence,
        club: clubNom(g),
      }));
    },
  });

  const apercu = useMemo(() => {
    if (!csv.trim()) return null;
    try {
      const rows = parseCsvGrimpeurs(csv, MAPPING_FFME);
      return { rows, ...planifierImport(rows, existants, { force }) };
    } catch {
      return null;
    }
  }, [csv, existants, force]);

  const appliquer = useMutation({
    mutationFn: async (plan: PlanItem[]) => {
      // Résolution / création des clubs par nom (title-case déjà appliqué au parse).
      const { data: clubsData, error: clubsErr } = await supabase
        .from("club")
        .select("id, nom");
      if (clubsErr) throw clubsErr;
      const clubId = new Map<string, number>();
      for (const c of clubsData as { id: number; nom: string }[]) {
        clubId.set(c.nom.toLowerCase(), c.id);
      }
      const resoudreClub = async (nom: string): Promise<number> => {
        const cache = clubId.get(nom.toLowerCase());
        if (cache) return cache;
        const { data, error } = await supabase
          .from("club")
          .insert({ nom, ville: "-" })
          .select("id")
          .single();
        if (error) throw error;
        clubId.set(nom.toLowerCase(), data.id);
        return data.id;
      };

      for (const { row, action } of plan) {
        if (action.type === "create") {
          const club_id = await resoudreClub(row.club);
          const { error } = await supabase.from("grimpeur").insert({
            nom: row.nom,
            prenom: row.prenom,
            annee_naissance: row.anneeNaissance,
            sexe: row.sexe,
            licence: row.licence,
            club_id,
          });
          if (error) throw error;
        } else if (action.type === "move") {
          const club_id = await resoudreClub(action.changements.club);
          const { error } = await supabase
            .from("grimpeur")
            .update({ club_id })
            .eq("id", action.id);
          if (error) throw error;
        } else if (action.type === "update") {
          const patch: Record<string, unknown> = {};
          const c = action.changements;
          if (c.nom !== undefined) patch.nom = c.nom;
          if (c.prenom !== undefined) patch.prenom = c.prenom;
          if (c.anneeNaissance !== undefined)
            patch.annee_naissance = c.anneeNaissance;
          if (c.licence !== undefined) patch.licence = c.licence;
          if (c.club !== undefined) patch.club_id = await resoudreClub(c.club);
          const { error } = await supabase
            .from("grimpeur")
            .update(patch)
            .eq("id", action.id);
          if (error) throw error;
        }
        // skip / ignore : aucune écriture
      }
    },
    onSuccess: () => {
      const r = apercu?.resume;
      setApplied(
        r
          ? `Import appliqué : ${r.created} créés, ${r.updated} modifiés, ${r.moved} déplacés, ${r.existed} inchangés, ${r.ignored} ignorés.`
          : "Import appliqué.",
      );
      setError(null);
      setCsv("");
      setFichier("");
      qc.invalidateQueries({ queryKey: ["admin", "grimpeurs"] });
    },
    onError: (e: { code?: string; message?: string }) => setError(frError(e)),
  });

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setApplied(null);
    setError(null);
    if (!f) return;
    setFichier(f.name);
    const lecteur = new FileReader();
    lecteur.onload = () => setCsv(String(lecteur.result ?? ""));
    lecteur.readAsText(f, "utf-8");
  }

  const r = apercu?.resume;

  return (
    <>
      <h1 className="h4 mb-4">Import des grimpeurs (CSV)</h1>

      {error && (
        <div className="alert alert-danger py-2" role="alert">
          {error}
        </div>
      )}
      {applied && (
        <div className="alert alert-success py-2" role="alert">
          {applied}
        </div>
      )}

      <div className="row g-2 align-items-end mb-4">
        <div className="col-12 col-md-6">
          <label className="form-label">Fichier CSV (FFME)</label>
          <input
            type="file"
            accept=".csv,text/csv"
            className="form-control"
            onChange={onFile}
          />
          <div className="form-text">
            Colonnes attendues : Structure, Numéro de licence, Nom complet, Date de
            naissance (colonne « Sexe » optionnelle, sinon déduite du prénom).
          </div>
        </div>
        <div className="col-12 col-md-auto">
          <div className="form-check">
            <input
              id="force"
              type="checkbox"
              className="form-check-input"
              checked={force}
              onChange={(e) => setForce(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="force">
              Forcer les mises à jour de conflit
            </label>
          </div>
        </div>
      </div>

      {isLoading && <p className="text-muted">Chargement du référentiel…</p>}

      {r && (
        <>
          <div className="d-flex flex-wrap gap-3 mb-3">
            <span>
              <strong>{r.created}</strong> à créer ({r.filles} F / {r.garcons} H)
            </span>
            <span>
              <strong>{r.updated}</strong> à mettre à jour
            </span>
            <span>
              <strong>{r.moved}</strong> à déplacer
            </span>
            <span>
              <strong>{r.existed}</strong> inchangés
            </span>
            <span>
              <strong>{r.ignored}</strong> ignorés
            </span>
          </div>

          {r.clubs.length > 0 && (
            <div className="alert alert-info py-2">
              {r.clubs.length} club(s) à créer : {r.clubs.join(", ")}
            </div>
          )}
          {r.prenomsInconnus.length > 0 && (
            <div className="alert alert-warning py-2">
              Sexe indéterminé (à vérifier) : {r.prenomsInconnus.join(", ")}
            </div>
          )}

          <button
            className="btn btn-primary mb-3"
            disabled={appliquer.isPending || !apercu}
            onClick={() => apercu && appliquer.mutate(apercu.plan)}
          >
            {appliquer.isPending ? "Application…" : "Appliquer l'import"}
          </button>

          <table className="table table-sm table-hover align-middle">
            <thead>
              <tr>
                <th>Action</th>
                <th>Nom</th>
                <th>Prénom</th>
                <th>Année</th>
                <th>Sexe</th>
                <th>Licence</th>
                <th>Club</th>
              </tr>
            </thead>
            <tbody>
              {apercu!.plan.map(({ row, action }, i) => (
                <tr key={i}>
                  <td>
                    <span className={`badge ${ACTION_BADGE[action.type]}`}>
                      {ACTION_LABEL[action.type]}
                    </span>
                    {"motif" in action && action.motif && (
                      <small className="text-muted ms-1">
                        {MOTIF_LABEL[action.motif]}
                      </small>
                    )}
                  </td>
                  <td>{row.nom}</td>
                  <td>{row.prenom}</td>
                  <td>{row.anneeNaissance}</td>
                  <td>{SEXE[row.sexe]}</td>
                  <td>{row.licence}</td>
                  <td>{row.club}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </>
  );
}

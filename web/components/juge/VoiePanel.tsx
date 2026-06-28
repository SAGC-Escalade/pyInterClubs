"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { frError } from "@/lib/errors";
import { unObjet } from "@/lib/supabase/embed";
import { etiquetteTemps } from "@/lib/juge/temps";
import Autocomplete from "@/components/Autocomplete";
import PerfInput from "./PerfInput";

export type Zone = { label: string; points: number | string | null };
type Grimpeur = { nom: string; prenom: string; sexe: number };
type ClubRef = { nom: string };
type EquipeRef = { club: ClubRef | ClubRef[] | null };
type ScoreRef = {
  grimpeur: Grimpeur | Grimpeur[] | null;
  equipe: EquipeRef | EquipeRef[] | null;
};
export type Perf = {
  id: number;
  voie_id: number | null;
  etat: number | null;
  temps: string | null;
  points: number | null;
  score: ScoreRef | ScoreRef[] | null;
};

type Voie = { id: number; nom: string; niveau: string; type: number; zones: Zone[] };

const estScore = (p: Perf) => p.etat !== null || p.temps !== null;
const sansAccent = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function grimpeurDe(p: Perf): Grimpeur | null {
  return unObjet(unObjet(p.score)?.grimpeur);
}
function clubDe(p: Perf): string | null {
  return unObjet(unObjet(unObjet(p.score)?.equipe)?.club)?.nom ?? null;
}

/**
 * Tranche 4 (juge) — contenu d'une voie (doc 05 §2/§5). Liste les grimpeurs à
 * scorer (invalides) puis les scorés (valides), avec recherche par nom. Pour une
 * voie de diff, permet d'enregistrer un grimpeur (affecte sa 1re voie de diff).
 */
export default function VoiePanel({
  voie,
  perfs,
  rencontre,
}: {
  voie: Voie;
  perfs: Perf[];
  rencontre: number;
}) {
  const supabase = createClient();
  const qc = useQueryClient();
  const [filtre, setFiltre] = useState("");

  const correspond = (p: Perf) => {
    const g = grimpeurDe(p);
    if (!g) return false;
    return sansAccent(`${g.nom} ${g.prenom}`).includes(sansAccent(filtre));
  };

  const invalides = perfs.filter((p) => !estScore(p) && correspond(p));
  const valides = perfs.filter((p) => estScore(p) && correspond(p));

  // Candidats à enregistrer (voies de diff uniquement) : grimpeurs ayant une
  // performance de diff sans voie dans la rencontre (doc 05 §3/§5).
  const { data: candidats = [] } = useQuery({
    queryKey: ["juge", "register", rencontre],
    enabled: voie.type === 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("performance")
        .select(
          "score_id, score:score_id(grimpeur:grimpeur_id(nom, prenom), equipe:equipe_id(rencontre_id))",
        )
        .is("voie_id", null);
      if (error) throw error;
      const vus = new Set<number>();
      const options: { value: number; label: string }[] = [];
      const rows = data as unknown as {
        score_id: number;
        score: {
          grimpeur: Grimpeur | Grimpeur[] | null;
          equipe: { rencontre_id: number } | { rencontre_id: number }[] | null;
        } | null;
      }[];
      for (const r of rows) {
        const sc = r.score;
        const eq = unObjet(sc?.equipe);
        if (eq?.rencontre_id !== rencontre || vus.has(r.score_id)) continue;
        vus.add(r.score_id);
        const g = unObjet(sc?.grimpeur);
        options.push({ value: r.score_id, label: g ? `${g.nom} ${g.prenom}` : `#${r.score_id}` });
      }
      return options;
    },
  });

  const enregistrer = useMutation({
    mutationFn: async (scoreId: number) => {
      const { error } = await supabase.rpc("fn_juge_register", {
        p_score_id: scoreId,
        p_voie_id: voie.id,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["juge"] }),
  });

  const ligne = (p: Perf) => {
    const g = grimpeurDe(p);
    return (
      <li className="list-group-item d-flex justify-content-between align-items-center gap-2 flex-wrap" key={p.id}>
        <span>
          {g?.nom} {g?.prenom}
          {clubDe(p) && <small className="text-muted ms-2">{clubDe(p)}</small>}
          {voie.type === 3 && (
            <small className="text-muted ms-2">{etiquetteTemps(p.temps)}</small>
          )}
        </span>
        <PerfInput perf={p} voie={voie} />
      </li>
    );
  };

  return (
    <>
      <input
        className="form-control mb-3"
        placeholder="Rechercher un grimpeur…"
        value={filtre}
        onChange={(e) => setFiltre(e.target.value)}
      />

      {voie.type === 2 && (
        <div className="mb-3">
          <label className="form-label small mb-1">Enregistrer un grimpeur</label>
          <Autocomplete
            options={candidats}
            value={null}
            onChange={(id) => {
              if (id != null) enregistrer.mutate(id);
            }}
            placeholder="Grimpeur à affecter à cette voie…"
          />
          {enregistrer.error && (
            <div className="alert alert-danger py-2 mt-2" role="alert">
              {frError(enregistrer.error as { code?: string; message?: string })}
            </div>
          )}
        </div>
      )}

      <h2 className="h6 text-muted text-uppercase">À scorer ({invalides.length})</h2>
      <ul className="list-group mb-4">
        {invalides.map(ligne)}
        {invalides.length === 0 && (
          <li className="list-group-item text-muted">Rien à scorer.</li>
        )}
      </ul>

      <h2 className="h6 text-muted text-uppercase">Scorés ({valides.length})</h2>
      <ul className="list-group">
        {valides.map(ligne)}
        {valides.length === 0 && (
          <li className="list-group-item text-muted">Aucun grimpeur scoré.</li>
        )}
      </ul>
    </>
  );
}

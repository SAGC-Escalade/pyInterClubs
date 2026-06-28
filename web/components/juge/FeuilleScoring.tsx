"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { TYPE_VOIE } from "@/lib/constants";
import { useRealtime } from "@/lib/realtime/useRealtime";
import VoiePanel, { type Perf, type Zone } from "./VoiePanel";

type Voie = {
  id: number;
  nom: string;
  niveau: string;
  type: number;
  zones: Zone[];
};

const estScore = (p: Perf) => p.etat !== null || p.temps !== null;

/**
 * Tranche 4 (juge) — feuille de scoring (doc 05 §2). Un onglet par voie affectée,
 * avec un compteur « scorés / total ». Le périmètre (voies) vient des claims de
 * session ; la lecture/écriture est bornée par le RLS (doc 10 §3).
 */
export default function FeuilleScoring({
  voies,
  rencontre,
}: {
  voies: number[];
  rencontre: number;
}) {
  const supabase = createClient();
  const qc = useQueryClient();

  const { data: details = [] } = useQuery({
    queryKey: ["juge", "voies", voies.join(",")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("voie")
        .select("id, nom, niveau, type, zones")
        .in("id", voies)
        .order("id");
      if (error) throw error;
      return data as Voie[];
    },
  });

  const { data: perfs = [] } = useQuery({
    queryKey: ["juge", "perfs", voies.join(",")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("performance")
        .select(
          "id, voie_id, etat, temps, points, score:score_id(grimpeur:grimpeur_id(nom, prenom, sexe), equipe:equipe_id(club:club_id(nom)))",
        )
        .in("voie_id", voies);
      if (error) throw error;
      return data as Perf[];
    },
  });

  useRealtime(["performance", "score"], () =>
    qc.invalidateQueries({ queryKey: ["juge"] }),
  );

  const [actif, setActif] = useState<number | null>(null);
  const voieActive = details.find((v) => v.id === (actif ?? details[0]?.id));

  const parVoie = (id: number) => perfs.filter((p) => p.voie_id === id);

  return (
    <>
      <h1 className="h4 mb-3">Feuille de scoring</h1>

      <ul className="nav nav-tabs mb-3">
        {details.map((v) => {
          const list = parVoie(v.id);
          const scores = list.filter(estScore).length;
          const estActif = v.id === voieActive?.id;
          return (
            <li className="nav-item" key={v.id}>
              <button
                className={`nav-link ${estActif ? "active" : ""}`}
                onClick={() => setActif(v.id)}
              >
                {TYPE_VOIE[v.type]} {v.nom}
                <span className="badge bg-secondary ms-2">
                  {scores}/{list.length}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {voieActive ? (
        <VoiePanel
          voie={voieActive}
          perfs={parVoie(voieActive.id)}
          rencontre={rencontre}
        />
      ) : (
        <p className="text-muted">Chargement…</p>
      )}
    </>
  );
}

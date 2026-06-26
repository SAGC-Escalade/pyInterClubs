"use client";

import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import FlipMove from "react-flip-move";
import { createClient } from "@/lib/supabase/client";
import { useRealtime } from "@/lib/realtime/useRealtime";
import { categorieAge } from "@/lib/categorie";

type ClassementRow = {
  score_id: number;
  rencontre_id: number;
  saison: number;
  grimpeur_id: number;
  nom: string;
  prenom: string;
  sexe: number;
  annee_naissance: number;
  club_nom: string | null;
  points: number;
  valide: boolean;
  rang: number;
};

const medalClass = (rang: number) =>
  rang === 1 ? "gold" : rang === 2 ? "silver" : rang === 3 ? "bronze" : "";

function RankingRow({ row }: { row: ClassementRow }) {
  const genre =
    row.sexe === 1
      ? { sym: "♀", cls: "sexe femme" }
      : row.sexe === 2
        ? { sym: "♂", cls: "sexe homme" }
        : { sym: "•", cls: "" };

  return (
    <li className="list-group-item d-flex align-items-center">
      <div className="me-2 text-end" style={{ width: "3ch" }}>
        <span className={`fw-bold ${medalClass(row.rang)}`}>{row.rang}.</span>
      </div>
      <div className={`me-2 ${genre.cls}`} style={{ width: "1.5ch" }}>
        {genre.sym}
      </div>
      <div className="row flex-grow-1 g-0">
        <div className="col-12 col-sm-6 text-truncate">
          {row.nom} {row.prenom}
        </div>
        <div className="col-8 col-sm-4 text-truncate">
          {row.club_nom && <small className="text-muted">{row.club_nom}</small>}
        </div>
        <div className="col-4 col-sm-2 text-truncate">
          <small className="text-muted">
            {categorieAge(row.annee_naissance, row.saison)}
          </small>
        </div>
      </div>
      <div className="text-end ms-auto">
        <span className={`badge ${row.valide ? "bg-success" : "bg-primary"}`}>
          {row.points ?? 0}
          <span className="d-none d-sm-inline ms-1">pts</span>
        </span>
      </div>
    </li>
  );
}

export default function Ranking({ rencontreId }: { rencontreId: number }) {
  const supabase = createClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["classement", rencontreId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_classement")
        .select("*")
        .eq("rencontre_id", rencontreId)
        .order("points", { ascending: false });
      if (error) throw error;
      return data as ClassementRow[];
    },
  });

  // Rafraîchit le classement à tout changement de score/performance (doc 07).
  const onChange = useCallback(() => {
    void refetch();
  }, [refetch]);
  useRealtime(["score", "performance", "equipe"], onChange);

  if (isLoading) {
    return (
      <ul className="list-group">
        <li className="list-group-item">
          <span className="placeholder col-6" />
        </li>
      </ul>
    );
  }

  const rows = data ?? [];
  if (rows.length === 0) {
    return (
      <ul className="list-group">
        <li className="list-group-item text-muted">Aucun grimpeur inscrit</li>
      </ul>
    );
  }

  return (
    <FlipMove typeName="ul" className="list-group">
      <li
        className="list-group-item d-flex fw-bold sticky-top bg-body"
        style={{ borderBottom: "2px solid var(--bs-border-color)" }}
      >
        <div className="me-2 text-end" style={{ width: "3ch" }}>
          #
        </div>
        <div className="me-2" style={{ width: "1.5ch" }} />
        <div className="row flex-grow-1 g-0">
          <div className="col-12 col-sm-6">Nom</div>
          <div className="d-none d-sm-block col-sm-4">Club</div>
          <div className="d-none d-sm-block col-sm-2">Catégorie</div>
        </div>
        <div className="text-end ms-auto">Score</div>
      </li>
      {rows.map((row) => (
        <RankingRow key={row.score_id} row={row} />
      ))}
    </FlipMove>
  );
}

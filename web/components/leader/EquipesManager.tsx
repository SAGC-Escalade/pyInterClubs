"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { frError } from "@/lib/errors";
import { unObjet } from "@/lib/supabase/embed";
import { bornesAnneeNaissance } from "@/lib/leader/candidats";
import { useRealtime } from "@/lib/realtime/useRealtime";
import { reconcileCache } from "@/lib/realtime/reconcile";
import {
  topicEquipe,
  topicClubEquipes,
  topicClubScores,
} from "@/lib/realtime/topics";
import { surStatutRealtime } from "@/lib/ui/toast";
import EquipeCard, { type Candidat, type VoieDiff } from "./EquipeCard";

type EquipeRow = {
  equipe_id: number;
  numero: number;
  points: number;
  nb_membres: number;
  valide: boolean;
};

/**
 * Tranche 4 (coach) — « Mes équipes » de la rencontre courante (doc 04 §2/§3).
 * Le coach ne voit/écrit que les équipes de son club (RLS, doc 10 §3). Live via
 * Realtime : la saisie d'un juge met à jour points/validité en direct.
 */
export default function EquipesManager({
  rencontre,
  club,
}: {
  rencontre: number;
  club: number;
}) {
  const supabase = createClient();
  const qc = useQueryClient();
  const cle = ["leader", "equipes", rencontre, club];

  const { data: equipes = [], isLoading } = useQuery({
    queryKey: cle,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_equipe_points")
        .select("equipe_id, numero, points, nb_membres, valide")
        .eq("rencontre_id", rencontre)
        .eq("club_id", club)
        .order("numero");
      if (error) throw error;
      return data as EquipeRow[];
    },
  });

  // Métadonnées partagées par toutes les cartes (saison, mode groupé, voies de
  // diff de la rencontre, liste des clubs pour le club prêteur).
  const { data: meta } = useQuery({
    queryKey: ["leader", "meta", rencontre],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rencontre")
        .select("saison, categorie, voies_groupees")
        .eq("id", rencontre)
        .single();
      if (error) throw error;
      return data as { saison: number; categorie: number; voies_groupees: boolean };
    },
  });

  const { data: diffVoies = [] } = useQuery({
    queryKey: ["leader", "diff-voies", rencontre],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rencontre_voie")
        .select("voie:voie_id(id, nom, genre, type)")
        .eq("rencontre_id", rencontre);
      if (error) throw error;
      return (data as { voie: VoieDiff | VoieDiff[] | null }[])
        .map((r) => unObjet(r.voie))
        .filter((v): v is VoieDiff => Boolean(v) && v!.type === 2);
    },
  });

  const { data: clubs = [] } = useQuery({
    queryKey: ["leader", "clubs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("club")
        .select("id, nom")
        .order("nom");
      if (error) throw error;
      return (data as { id: number; nom: string }[]).map((c) => ({
        value: c.id,
        label: c.nom,
      }));
    },
  });

  // Grimpeurs du club non inscrits ET dans la tranche d'âge de la rencontre
  // (doc 04 §3 : enfants 8–13 ans, ado/mixte 13–19 ans).
  const { data: candidats = [] } = useQuery({
    queryKey: ["leader", "candidats", rencontre, club, meta?.categorie, meta?.saison],
    enabled: !!meta,
    queryFn: async () => {
      const { min, max } = bornesAnneeNaissance(meta!.categorie, meta!.saison);
      const [{ data: grimpeurs, error: e1 }, { data: inscrits, error: e2 }] =
        await Promise.all([
          supabase
            .from("grimpeur")
            .select("id, nom, prenom, annee_naissance, sexe")
            .eq("club_id", club)
            .gte("annee_naissance", min)
            .lte("annee_naissance", max)
            .order("nom"),
          supabase
            .from("score")
            .select("grimpeur_id, equipe:equipe_id!inner(rencontre_id)")
            .eq("equipe.rencontre_id", rencontre),
        ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const pris = new Set(
        (inscrits as { grimpeur_id: number }[]).map((s) => s.grimpeur_id),
      );
      return (grimpeurs as Candidat[]).filter((g) => !pris.has(g.id));
    },
  });

  // Live (doc 07 §3.1/§4) — abonnement scindé par rencontre/club :
  // - maj optimiste des points/validité des équipes existantes (liste plate) via
  //   reconcileCache, sur le topic de chaque équipe ;
  const opts = { debounceMs: 150, onStatus: surStatutRealtime };
  useRealtime(
    equipes.map((e) => topicEquipe(rencontre, e.equipe_id)),
    (payload) =>
      qc.setQueryData<EquipeRow[]>(cle, (old) =>
        reconcileCache(old ?? [], payload as never, (x) =>
          (x as { equipe_id?: number; deleted?: { id: number } }).equipe_id,
        ) as EquipeRow[],
      ),
    opts,
  );
  // - ajout/suppression d'équipe ou de membre du club -> refetch ciblé (repli).
  useRealtime(
    [topicClubEquipes(rencontre, club), topicClubScores(rencontre, club)],
    () => qc.invalidateQueries({ queryKey: ["leader"] }),
    opts,
  );

  const creer = useMutation({
    mutationFn: async () => {
      const numero = equipes.reduce((m, e) => Math.max(m, e.numero), 0) + 1;
      const { error } = await supabase
        .from("equipe")
        .insert({ rencontre_id: rencontre, club_id: club, numero });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: cle }),
  });

  const supprimer = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("equipe").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: cle }),
  });

  const error = creer.error || supprimer.error;

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h1 className="h4 mb-0">Mes équipes</h1>
        <button
          className="btn btn-primary"
          onClick={() => creer.mutate()}
          disabled={creer.isPending}
        >
          Ajouter une équipe
        </button>
      </div>

      {error && (
        <div className="alert alert-danger py-2" role="alert">
          {frError(error as { code?: string; message?: string })}
        </div>
      )}

      {isLoading ? (
        <p className="text-muted">Chargement…</p>
      ) : equipes.length === 0 ? (
        <p className="text-muted">
          Aucune équipe. Ajoutez-en une pour inscrire vos grimpeurs.
        </p>
      ) : (
        equipes.map((e) => (
          <EquipeCard
            key={e.equipe_id}
            equipe={e}
            saison={meta?.saison ?? 0}
            voiesGroupees={meta?.voies_groupees ?? false}
            diffVoies={diffVoies}
            clubs={clubs}
            candidats={candidats}
            onDelete={() => {
              if (confirm(`Supprimer l'équipe n°${e.numero} ?`))
                supprimer.mutate(e.equipe_id);
            }}
          />
        ))
      )}
    </>
  );
}

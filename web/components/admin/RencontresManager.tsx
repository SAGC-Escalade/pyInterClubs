"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { frError } from "@/lib/errors";
import { CATEGORIE } from "@/lib/constants";

type Rencontre = {
  id: number;
  saison: number;
  date: string;
  categorie: number;
  nb_bloc: number;
  nb_diff: number;
  nb_vitesse: number;
  voies_reutilisables: boolean;
  voies_groupees: boolean;
  club_nom: string;
  club_ville: string;
  nb_voies: number;
  nb_equipes: number;
};

const dateFr = (iso: string) => new Date(iso).toLocaleDateString("fr-FR");

export default function RencontresManager() {
  const supabase = createClient();
  const qc = useQueryClient();

  const { data: rencontres = [], isLoading } = useQuery({
    queryKey: ["admin", "rencontres"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_rencontre_admin")
        .select("*")
        .order("date", { ascending: false })
        .order("id", { ascending: false });
      if (error) throw error;
      return data as Rencontre[];
    },
  });

  // Rencontre courante effective (DEFAULT_RENCONTRE sinon la plus récente).
  const { data: couranteId } = useQuery({
    queryKey: ["admin", "rencontre-courante"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("default_rencontre_id");
      if (error) throw error;
      return (data as number | null) ?? null;
    },
  });

  const setCourante = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.rpc("fn_set_default_rencontre", { p_id: id });
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["admin", "rencontre-courante"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("rencontre").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "rencontres"] });
      qc.invalidateQueries({ queryKey: ["admin", "rencontre-courante"] });
    },
  });

  // Rencontres démarrées = celles ayant au moins un coach provisionné (doc 03 §5).
  const { data: demarrees } = useQuery({
    queryKey: ["admin", "rencontres-demarrees"],
    queryFn: async () => {
      const { data, error } = await supabase.from("coach").select("rencontre_id");
      if (error) throw error;
      return new Set((data as { rencontre_id: number }[]).map((c) => c.rencontre_id));
    },
  });

  // Provisioning (service_role) : passe par les route handlers serveur.
  async function postProvisioning(path: string, echec: string) {
    const res = await fetch(path, { method: "POST" });
    if (!res.ok) {
      const corps = (await res.json().catch(() => ({}))) as { erreur?: string };
      throw new Error(corps.erreur ?? echec);
    }
  }

  const demarrer = useMutation({
    mutationFn: (id: number) =>
      postProvisioning(`/admin/rencontres/${id}/demarrer`, "Échec du démarrage."),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["admin", "rencontres-demarrees"] }),
  });

  const arreter = useMutation({
    mutationFn: (id: number) =>
      postProvisioning(`/admin/rencontres/${id}/arreter`, "Échec de l'arrêt."),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["admin", "rencontres-demarrees"] }),
  });

  const enCours = demarrer.isPending || arreter.isPending;
  const error =
    setCourante.error || remove.error || demarrer.error || arreter.error;

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h1 className="h4 mb-0">Rencontres</h1>
        <Link href="/admin/rencontres/create" className="btn btn-primary">
          Créer une rencontre
        </Link>
      </div>

      {error && (
        <div className="alert alert-danger py-2" role="alert">
          {frError(error as { code?: string; message?: string })}
        </div>
      )}

      {isLoading ? (
        <p className="text-muted">Chargement…</p>
      ) : (
        <table className="table table-hover align-middle">
          <thead>
            <tr>
              <th>Saison</th>
              <th>Date</th>
              <th>Club hôte</th>
              <th>Catégorie</th>
              <th>Voies</th>
              <th>Équipes</th>
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rencontres.map((r) => {
              const courante = r.id === couranteId;
              const demarree = demarrees?.has(r.id) ?? false;
              return (
                <tr key={r.id} className={courante ? "table-primary" : ""}>
                  <td>{r.saison}</td>
                  <td>{dateFr(r.date)}</td>
                  <td>
                    {r.club_nom}
                    {r.club_ville && (
                      <small className="text-muted"> ({r.club_ville})</small>
                    )}
                  </td>
                  <td>{CATEGORIE[r.categorie]}</td>
                  <td>{r.nb_voies}</td>
                  <td>{r.nb_equipes}</td>
                  <td className="text-end">
                    {courante ? (
                      <span className="badge bg-primary me-2">Courante</span>
                    ) : (
                      <button
                        className="btn btn-sm btn-outline-primary me-2"
                        onClick={() => setCourante.mutate(r.id)}
                        disabled={setCourante.isPending}
                      >
                        Définir comme courante
                      </button>
                    )}
                    {demarree ? (
                      <>
                        <span className="badge bg-success me-2">Démarrée</span>
                        <Link
                          href={`/admin/rencontres/${r.id}/acces`}
                          className="btn btn-sm btn-outline-secondary me-2"
                        >
                          Accès &amp; QR
                        </Link>
                        <button
                          className="btn btn-sm btn-outline-warning me-2"
                          onClick={() => {
                            if (
                              confirm(
                                "Arrêter la rencontre ? Les comptes coachs/juges seront révoqués (les résultats sont conservés).",
                              )
                            )
                              arreter.mutate(r.id);
                          }}
                          disabled={enCours}
                        >
                          Arrêter
                        </button>
                      </>
                    ) : (
                      <button
                        className="btn btn-sm btn-outline-success me-2"
                        onClick={() => demarrer.mutate(r.id)}
                        disabled={enCours}
                      >
                        Démarrer
                      </button>
                    )}
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => {
                        if (
                          confirm(
                            `Supprimer la rencontre de ${r.club_nom} du ${dateFr(r.date)} ?`,
                          )
                        )
                          remove.mutate(r.id);
                      }}
                      disabled={demarree}
                      title={
                        demarree ? "Arrêtez la rencontre avant de la supprimer" : undefined
                      }
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              );
            })}
            {rencontres.length === 0 && (
              <tr>
                <td colSpan={7} className="text-muted">
                  Aucune rencontre. Créez-en une pour commencer.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </>
  );
}

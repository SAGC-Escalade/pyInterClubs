"use client";

import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { frError } from "@/lib/errors";
import { qrExchangeUrl } from "@/lib/auth/token";

/**
 * Tranche 4 — écran « Accès & QR » d'une rencontre démarrée (doc 03 §6/§7).
 * Liste les liens de connexion coachs et permet d'affecter des juges aux voies.
 * Le lien contient le token du QR (à présenter aux coachs/juges sur place).
 */

type Jointure<T> = T | T[] | null;

type CoachRow = { token: string | null; club: Jointure<{ nom: string; ville: string }> };
type VoieRow = { voie_id: number; juge_id: number | null; voie: Jointure<{ nom: string }> };
type JugeRow = { id: number; nom: string; token: string | null };

function unObjet<T>(v: Jointure<T>): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export default function AccesManager({ rencontreId }: { rencontreId: number }) {
  const supabase = createClient();
  const qc = useQueryClient();
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const cle = ["admin", "acces", rencontreId];

  const { data: coachs = [] } = useQuery({
    queryKey: [...cle, "coachs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coach")
        .select("token, club:club_id(nom, ville)")
        .eq("rencontre_id", rencontreId);
      if (error) throw error;
      return data as CoachRow[];
    },
  });

  const { data: voies = [] } = useQuery({
    queryKey: [...cle, "voies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rencontre_voie")
        .select("voie_id, juge_id, voie:voie_id(nom)")
        .eq("rencontre_id", rencontreId)
        .order("voie_id");
      if (error) throw error;
      return data as VoieRow[];
    },
  });

  const { data: juges = [] } = useQuery({
    queryKey: [...cle, "juges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("juge")
        .select("id, nom, token")
        .eq("rencontre_id", rencontreId)
        .order("nom");
      if (error) throw error;
      return data as JugeRow[];
    },
  });

  const [nom, setNom] = useState("");
  const [voieIds, setVoieIds] = useState<number[]>([]);

  const affecter = useMutation({
    mutationFn: async () => {
      const res = await fetch("/admin/juges", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rencontreId, nom, voieIds }),
      });
      if (!res.ok) {
        const corps = (await res.json().catch(() => ({}))) as { erreur?: string };
        throw new Error(corps.erreur ?? "Échec de l'affectation.");
      }
    },
    onSuccess: () => {
      setNom("");
      setVoieIds([]);
      qc.invalidateQueries({ queryKey: cle });
    },
  });

  const toggleVoie = (id: number) =>
    setVoieIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h1 className="h4 mb-0">Accès &amp; QR</h1>
        <Link href="/admin/rencontres" className="btn btn-outline-secondary btn-sm">
          ← Rencontres
        </Link>
      </div>

      {affecter.error && (
        <div className="alert alert-danger py-2" role="alert">
          {frError(affecter.error as { code?: string; message?: string })}
        </div>
      )}

      <section className="mb-5">
        <h2 className="h6 text-muted text-uppercase">Coachs</h2>
        <p className="small text-muted">
          Lien/QR de connexion à présenter à chaque club (il contient le jeton
          d&apos;accès).
        </p>
        <ul className="list-group">
          {coachs.map((c, i) => {
            const club = unObjet(c.club);
            const url = c.token ? qrExchangeUrl(c.token, origin) : "";
            return (
              <li
                key={i}
                className="list-group-item d-flex justify-content-between align-items-center gap-3"
              >
                <span>
                  {club?.nom}
                  {club?.ville && <small className="text-muted"> ({club.ville})</small>}
                </span>
                {url && (
                  <a href={url} className="text-truncate" style={{ maxWidth: "60%" }}>
                    {url}
                  </a>
                )}
              </li>
            );
          })}
          {coachs.length === 0 && (
            <li className="list-group-item text-muted">Aucun coach provisionné.</li>
          )}
        </ul>
      </section>

      <section>
        <h2 className="h6 text-muted text-uppercase">Juges</h2>

        <form
          className="row g-2 align-items-end mb-3"
          onSubmit={(e) => {
            e.preventDefault();
            affecter.mutate();
          }}
        >
          <div className="col-12 col-md-4">
            <label className="form-label">Nom du juge</label>
            <input
              className="form-control"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Ex. Dupont"
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">Voies affectées</label>
            <div className="d-flex flex-wrap gap-3">
              {voies.map((v) => {
                const voie = unObjet(v.voie);
                return (
                  <div className="form-check" key={v.voie_id}>
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`voie-${v.voie_id}`}
                      checked={voieIds.includes(v.voie_id)}
                      onChange={() => toggleVoie(v.voie_id)}
                    />
                    <label className="form-check-label" htmlFor={`voie-${v.voie_id}`}>
                      {voie?.nom ?? `Voie ${v.voie_id}`}
                      {v.juge_id && (
                        <span className="badge bg-success ms-1">affectée</span>
                      )}
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="col-12 col-md-2">
            <button
              className="btn btn-primary w-100"
              type="submit"
              disabled={affecter.isPending}
            >
              Affecter
            </button>
          </div>
        </form>

        <ul className="list-group">
          {juges.map((j) => {
            const url = j.token ? qrExchangeUrl(j.token, origin) : "";
            return (
              <li
                key={j.id}
                className="list-group-item d-flex justify-content-between align-items-center gap-3"
              >
                <span>{j.nom}</span>
                {url && (
                  <a href={url} className="text-truncate" style={{ maxWidth: "60%" }}>
                    {url}
                  </a>
                )}
              </li>
            );
          })}
          {juges.length === 0 && (
            <li className="list-group-item text-muted">Aucun juge affecté.</li>
          )}
        </ul>
      </section>
    </>
  );
}

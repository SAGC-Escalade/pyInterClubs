"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { frError } from "@/lib/errors";
import {
  parseChrono,
  formatChrono,
  intervalVersSecondes,
  saisieVersInterval,
  type SaisieTemps,
} from "@/lib/juge/temps";
import type { Perf, Zone } from "./VoiePanel";

/**
 * Tranche 4 (juge) — saisie d'une performance (doc 05 §4). L'UI dépend du type :
 * bloc/diff -> menu d'état (zones) ; vitesse -> temps (mm:ss.cc) + cas spéciaux
 * Chute / Abandon. L'écriture est bornée par le RLS juge_write (voie affectée).
 */
export default function PerfInput({
  perf,
  voie,
}: {
  perf: Perf;
  voie: { type: number; zones: Zone[] };
}) {
  const supabase = createClient();
  const qc = useQueryClient();
  const invalider = () => qc.invalidateQueries({ queryKey: ["juge"] });

  const maj = useMutation({
    mutationFn: async (payload: { etat?: number | null; temps?: string | null }) => {
      const { error } = await supabase
        .from("performance")
        .update(payload)
        .eq("id", perf.id);
      if (error) throw error;
    },
    onSuccess: invalider,
  });

  // Bloc / Difficulté : menu d'état.
  if (voie.type !== 3) {
    return (
      <span className="d-flex align-items-center gap-2">
        <select
          className="form-select form-select-sm"
          style={{ width: "auto" }}
          value={perf.etat ?? ""}
          disabled={maj.isPending}
          onChange={(e) =>
            maj.mutate({ etat: e.target.value === "" ? null : Number(e.target.value) })
          }
        >
          <option value="">À réaliser</option>
          {voie.zones.map((z, i) => (
            <option key={i} value={i}>
              {z.label}
            </option>
          ))}
        </select>
        <span className="badge bg-light text-dark">{perf.points ?? "—"} pts</span>
        {maj.error && (
          <small className="text-danger">
            {frError(maj.error as { code?: string; message?: string })}
          </small>
        )}
      </span>
    );
  }

  return <PerfVitesse perf={perf} maj={maj} />;
}

function PerfVitesse({
  perf,
  maj,
}: {
  perf: Perf;
  maj: ReturnType<typeof useMutation<void, Error, { temps?: string | null }>>;
}) {
  const sec = intervalVersSecondes(perf.temps);
  const modeInitial: SaisieTemps["kind"] =
    perf.temps === null
      ? "areal"
      : sec === -60
        ? "chute"
        : sec === -120
          ? "abandon"
          : "temps";

  const [mode, setMode] = useState<SaisieTemps["kind"]>(modeInitial);
  const [chrono, setChrono] = useState(
    modeInitial === "temps" && sec !== null ? formatChrono(sec) : "",
  );
  const [erreur, setErreur] = useState<string | null>(null);

  const valider = () => {
    setErreur(null);
    let saisie: SaisieTemps;
    if (mode === "temps") {
      const s = parseChrono(chrono);
      if (s === null) {
        setErreur("Temps invalide (mm:ss.cc).");
        return;
      }
      saisie = { kind: "temps", secondes: s };
    } else {
      saisie = { kind: mode };
    }
    maj.mutate({ temps: saisieVersInterval(saisie) });
  };

  return (
    <span className="d-flex align-items-center gap-2 flex-wrap">
      <select
        className="form-select form-select-sm"
        style={{ width: "auto" }}
        value={mode}
        onChange={(e) => setMode(e.target.value as SaisieTemps["kind"])}
      >
        <option value="areal">À réaliser</option>
        <option value="temps">Temps</option>
        <option value="chute">Chute</option>
        <option value="abandon">Abandon</option>
      </select>
      {mode === "temps" && (
        <input
          className="form-control form-control-sm"
          style={{ width: "8rem" }}
          placeholder="mm:ss.cc"
          value={chrono}
          onChange={(e) => setChrono(e.target.value)}
        />
      )}
      <button
        className="btn btn-sm btn-primary"
        onClick={valider}
        disabled={maj.isPending}
      >
        Valider
      </button>
      <span className="badge bg-light text-dark">{perf.points ?? "—"} pts</span>
      {(erreur || maj.error) && (
        <small className="text-danger">
          {erreur ?? frError(maj.error as { code?: string; message?: string })}
        </small>
      )}
    </span>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Abonnement Realtime simple (Postgres Changes) — Tranche 1.
 * Déclenche `onChange` à tout changement (INSERT/UPDATE/DELETE) sur les tables
 * écoutées. Le composant appelant rafraîchit alors ses données (doc 07 §3.2).
 *
 * (En Tranche 6, on basculera vers une diffusion broadcast par trigger, avec
 * des topics par rencontre/voie — cf. doc 07 §3.1.)
 */
export function useRealtime(tables: string[], onChange: () => void) {
  const cb = useRef(onChange);
  cb.current = onChange;

  // Clé stable pour ne pas réabonner à chaque rendu.
  const key = tables.join(",");

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`rt:${key}`);

    for (const table of tables) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => cb.current(),
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Abonnement Realtime par **broadcast** (Tranche 6, doc 07 §3.1/§5).
 * Remplace l'abonnement `postgres_changes` générique de la Tranche 1 : on
 * s'abonne à des **topics** (dérivés des `event_id` Django, préfixés par
 * rencontre — cf. `lib/realtime/topics.ts`) émis par les triggers Postgres.
 *
 * `onMessage` reçoit le payload sérialisé (à réconcilier avec `reconcileCache`
 * ou à traiter par un refetch). `debounceMs` coalesce les rafales. `onStatus`
 * remonte l'état du canal (perte de connexion → toast côté appelant).
 */
export type UseRealtimeOptions = {
  debounceMs?: number;
  onStatus?: (status: string) => void;
};

export function useRealtime(
  topics: string[],
  onMessage: (payload: unknown) => void,
  opts: UseRealtimeOptions = {},
) {
  const { debounceMs = 0, onStatus } = opts;

  const cb = useRef(onMessage);
  cb.current = onMessage;
  const statusCb = useRef(onStatus);
  statusCb.current = onStatus;

  // Clé stable pour ne pas réabonner à chaque rendu.
  const key = topics.join(",");

  useEffect(() => {
    const supabase = createClient();

    const channels = topics.map((topic) => {
      let timer: ReturnType<typeof setTimeout> | null = null;
      let latest: unknown;

      const channel = supabase
        .channel(topic)
        .on(
          "broadcast",
          { event: "change" },
          (msg: { payload: unknown }) => {
            latest = msg.payload;
            if (debounceMs > 0) {
              if (timer) clearTimeout(timer);
              timer = setTimeout(() => cb.current(latest), debounceMs);
            } else {
              cb.current(msg.payload);
            }
          },
        )
        .subscribe((status: string) => statusCb.current?.(status));

      return channel;
    });

    return () => {
      for (const channel of channels) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, debounceMs]);
}

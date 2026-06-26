"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

/**
 * Client Supabase pour le navigateur (composants client).
 * Utilise la clé anon — toutes les opérations sont soumises au RLS (cf. doc 10).
 * Le temps réel (Supabase Realtime) passe par ce client (cf. doc 07).
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

type CookieToSet = { name: string; value: string; options?: Record<string, unknown> };

/**
 * Client Supabase côté serveur (route handlers, server components).
 * Lit/écrit la session via les cookies (auth token/QR -> JWT, cf. doc 10).
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll appelé depuis un Server Component : ignoré
            // (le middleware rafraîchit la session, cf. middleware.ts).
          }
        },
      },
    },
  );
}

/**
 * Client privilégié (service_role) — opérations hors RLS : provisioning des
 * comptes coach/juge à l'ouverture de rencontre, recalcul global, etc.
 * À N'UTILISER QUE dans des route handlers serveur, jamais exposé au client.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

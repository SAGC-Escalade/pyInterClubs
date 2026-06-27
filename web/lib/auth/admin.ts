import { createClient } from "@/lib/supabase/server";

/**
 * Résout l'état d'authentification admin côté serveur.
 * Équivalent cible de la résolution de rôle de pyInterClubsMiddleware (doc 10 §2).
 */
export async function getAdminSession(): Promise<{
  userId: string;
  email: string | null;
} | null> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // fn_is_admin() (SECURITY DEFINER) consulte app_admin via le JWT courant.
  const { data: isAdmin, error } = await supabase.rpc("fn_is_admin");
  if (error || !isAdmin) return null;

  return { userId: user.id, email: user.email ?? null };
}

import { createClient } from "@/lib/supabase/server";

/** Rôles terrain (valeurs françaises, cohérentes avec fn_current_role et les tables). */
export type Role = "admin" | "coach" | "juge";

/**
 * Session terrain résolue côté serveur. Le périmètre dépend du rôle :
 * un coach porte sa rencontre + son club, un juge sa rencontre + ses voies.
 */
export type SessionTerrain =
  | { role: "admin"; userId: string }
  | { role: "coach"; userId: string; rencontre: number; club: number }
  | { role: "juge"; userId: string; rencontre: number; voies: number[] };

/**
 * Résout le rôle et le périmètre de l'utilisateur courant (doc 10 §2),
 * équivalent cible de pyInterClubsMiddleware. Calqué sur getAdminSession :
 * on lit le périmètre via des fonctions SECURITY DEFINER (fn_current_role /
 * fn_current_rencontre / fn_current_club / fn_current_voies) qui consultent
 * les tables coach/juge selon le JWT courant. Renvoie null si non authentifié
 * ou sans rôle.
 */
export async function getFieldSession(): Promise<SessionTerrain | null> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: role, error } = await supabase.rpc("fn_current_role");
  if (error || !role) return null;

  if (role === "admin") {
    return { role: "admin", userId: user.id };
  }

  if (role === "coach") {
    const { data: rencontre } = await supabase.rpc("fn_current_rencontre");
    const { data: club } = await supabase.rpc("fn_current_club");
    return {
      role: "coach",
      userId: user.id,
      rencontre: rencontre as number,
      club: club as number,
    };
  }

  if (role === "juge") {
    const { data: rencontre } = await supabase.rpc("fn_current_rencontre");
    const { data: voies } = await supabase.rpc("fn_current_voies");
    return {
      role: "juge",
      userId: user.id,
      rencontre: rencontre as number,
      voies: (voies as number[]) ?? [],
    };
  }

  return null;
}

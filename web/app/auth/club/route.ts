import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

/**
 * Tranche 4 — échange jeton -> session (doc 10 §2).
 *
 * Le QR pointe vers /auth/club?token=… (équivalent de /accounts/club?token=
 * côté Django). On retrouve le coach/juge via le client service_role, on ouvre
 * une session Supabase pour son utilisateur Auth, puis on redirige vers son
 * espace (coach -> /leader, juge -> /judge). Les comptes coach/juge sont
 * provisionnés au démarrage de la rencontre (skill auth-provisioning).
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { erreur: "Lien d'accès invalide : jeton manquant." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // Coach d'abord, puis juge (jetons uniques sur chaque table).
  const { data: coach } = await admin
    .from("coach")
    .select("user_id, rencontre_id, club_id")
    .eq("token", token)
    .maybeSingle();

  let identite = coach as { user_id: string | null } | null;
  let destination = "/leader";

  if (!identite) {
    const { data: juge } = await admin
      .from("juge")
      .select("user_id, rencontre_id")
      .eq("token", token)
      .maybeSingle();
    identite = juge as { user_id: string | null } | null;
    destination = "/judge";
  }

  if (!identite) {
    return NextResponse.json(
      { erreur: "Lien d'accès inconnu ou révoqué." },
      { status: 401 },
    );
  }

  await ouvrirSession(admin, identite.user_id);

  // 303 : on bascule sur une navigation GET vers l'espace de l'identité.
  return NextResponse.redirect(new URL(destination, url.origin), { status: 303 });
}

/**
 * Ouvre une session Supabase pour l'utilisateur retrouvé : on génère un OTP de
 * type magiclink avec le client privilégié, puis on le consomme avec le client
 * lié aux cookies (ce qui pose les cookies de session sur la réponse).
 */
async function ouvrirSession(
  admin: ReturnType<typeof createAdminClient>,
  userId: string | null,
): Promise<void> {
  if (!userId) return;

  const { data: compte } = await admin.auth.admin.getUserById(userId);
  const email = compte?.user?.email;
  if (!email) return;

  const { data: lien } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const tokenHash = lien?.properties?.hashed_token;
  if (!tokenHash) return;

  const supabase = createClient();
  await supabase.auth.verifyOtp({ type: "email", token_hash: tokenHash });
}

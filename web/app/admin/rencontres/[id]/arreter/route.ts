import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Tranche 4 — arrêt d'une rencontre : déprovisioning (doc 03 §8, doc 10 §2).
 * On supprime les identités coach/juge (lignes + utilisateurs Auth) ce qui révoque
 * les tokens et force la déconnexion. Les données de compétition (équipes,
 * scores, performances) subsistent pour les rapports.
 */
export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json(
      { erreur: "Action réservée à l'administrateur." },
      { status: 403 },
    );
  }

  const rencontreId = Number(params.id);
  if (!rencontreId) {
    return NextResponse.json({ erreur: "Rencontre invalide." }, { status: 400 });
  }

  const admin = createAdminClient();

  // Récupère les utilisateurs Auth liés avant de supprimer les lignes.
  const { data: coachs } = await admin
    .from("coach")
    .select("user_id")
    .eq("rencontre_id", rencontreId);
  const { data: juges } = await admin
    .from("juge")
    .select("user_id")
    .eq("rencontre_id", rencontreId);

  // Suppression des lignes (rencontre_voie.juge_id repasse à null via FK).
  await admin.from("coach").delete().eq("rencontre_id", rencontreId);
  await admin.from("juge").delete().eq("rencontre_id", rencontreId);

  // Suppression des comptes Auth (révoque les sessions / tokens).
  const userIds = [...(coachs ?? []), ...(juges ?? [])]
    .map((r) => (r as { user_id: string | null }).user_id)
    .filter((id): id is string => Boolean(id));
  for (const userId of userIds) {
    await admin.auth.admin.deleteUser(userId);
  }

  return NextResponse.json({ revoques: userIds.length });
}

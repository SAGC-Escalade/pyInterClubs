import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { generateToken } from "@/lib/auth/token";
import {
  coachesAProvisionner,
  identityEmail,
  type ClubRef,
} from "@/lib/auth/provisioning";

/**
 * Tranche 4 — démarrage d'une rencontre : provisioning des coachs (doc 03 §5).
 * Pour chaque club sans coach, on crée un utilisateur Supabase Auth (e-mail
 * synthétique, login par QR) + une ligne `coach` portant le token du QR.
 * Réservé à l'admin ; le service_role contourne le RLS. Rejouable sans doublon.
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

  const { data: clubs } = await admin
    .from("club")
    .select("id, nom, ville")
    .order("nom");
  const { data: existants } = await admin
    .from("coach")
    .select("club_id")
    .eq("rencontre_id", rencontreId);

  const aCreer = coachesAProvisionner(
    (clubs ?? []) as ClubRef[],
    (existants ?? []) as { club_id: number }[],
  );

  let provisionnes = 0;
  for (const club of aCreer) {
    const token = generateToken();

    const { data: cree, error: authErr } = await admin.auth.admin.createUser({
      email: identityEmail("coach", token),
      email_confirm: true,
      user_metadata: { role: "coach", club_id: club.id, rencontre_id: rencontreId },
    });
    if (authErr || !cree?.user) continue;

    const { error: insErr } = await admin.from("coach").insert({
      rencontre_id: rencontreId,
      club_id: club.id,
      user_id: cree.user.id,
      token,
    });
    if (insErr) {
      // Pas de transaction possible entre l'API Auth et la base : on annule
      // l'utilisateur créé pour rester rejouable proprement.
      await admin.auth.admin.deleteUser(cree.user.id);
      continue;
    }
    provisionnes += 1;
  }

  return NextResponse.json({ provisionnes });
}

import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { generateToken, qrExchangeUrl } from "@/lib/auth/token";
import { identityEmail, validerAffectationJuge } from "@/lib/auth/provisioning";

/**
 * Tranche 4 — affectation d'un juge à des voies (doc 03 §6).
 * Crée une identité juge (utilisateur Auth + token QR) et rattache les
 * `rencontre_voie` sélectionnées. Réservé à l'admin (service_role).
 */
export async function POST(request: Request): Promise<Response> {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json(
      { erreur: "Action réservée à l'administrateur." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    rencontreId?: number;
    nom?: string;
    voieIds?: number[];
  } | null;

  const rencontreId = Number(body?.rencontreId);
  if (!rencontreId) {
    return NextResponse.json({ erreur: "Rencontre invalide." }, { status: 400 });
  }

  const valide = validerAffectationJuge(body?.nom ?? "", body?.voieIds ?? []);
  if (!valide.ok) {
    return NextResponse.json({ erreur: valide.erreur }, { status: 400 });
  }

  const admin = createAdminClient();
  const token = generateToken();

  const { data: cree, error: authErr } = await admin.auth.admin.createUser({
    email: identityEmail("juge", token),
    email_confirm: true,
    user_metadata: { role: "juge", rencontre_id: rencontreId },
  });
  if (authErr || !cree?.user) {
    return NextResponse.json(
      { erreur: "Impossible de créer l'identité du juge." },
      { status: 500 },
    );
  }

  const { data: juge, error: insErr } = await admin
    .from("juge")
    .insert({
      rencontre_id: rencontreId,
      nom: valide.nom,
      user_id: cree.user.id,
      token,
    })
    .select("id")
    .single();

  if (insErr || !juge) {
    await admin.auth.admin.deleteUser(cree.user.id);
    return NextResponse.json(
      { erreur: "Impossible d'enregistrer le juge." },
      { status: 500 },
    );
  }

  // Rattache les voies sélectionnées à ce juge (au sein de la rencontre).
  await admin
    .from("rencontre_voie")
    .update({ juge_id: juge.id })
    .eq("rencontre_id", rencontreId)
    .in("voie_id", valide.voieIds);

  const url = qrExchangeUrl(token, new URL(request.url).origin);
  return NextResponse.json({ jugeId: juge.id, token, url });
}

import { createClient } from "@/lib/supabase/server";

const CATEGORIE_LABEL: Record<number, string> = {
  1: "Enfants",
  2: "Adolescents",
  3: "Mixte",
};

export type RencontreEntete = {
  id: number;
  saison: number;
  date: string;
  categorie: number;
  ville: string | null;
  label: string;
};

/**
 * Résout la rencontre à afficher pour la page publique de résultats :
 * paramètre d'URL `?rencontre=` sinon `default_rencontre_id()` (cf. doc 03 §3).
 * Retourne null si aucune rencontre n'existe.
 */
export async function getRencontreEntete(
  rencontreParam?: string,
): Promise<RencontreEntete | null> {
  const supabase = createClient();

  let id: number | null = rencontreParam ? Number(rencontreParam) : null;
  if (!id || Number.isNaN(id)) {
    const { data } = await supabase.rpc("default_rencontre_id");
    id = (data as number | null) ?? null;
  }
  if (!id) return null;

  const { data: rencontre } = await supabase
    .from("rencontre")
    .select("id, saison, date, categorie, club:club_id(ville)")
    .eq("id", id)
    .maybeSingle();

  if (!rencontre) return null;

  const club = (rencontre as { club: unknown }).club;
  const ville =
    (Array.isArray(club)
      ? (club[0] as { ville?: string } | undefined)?.ville
      : (club as { ville?: string } | null)?.ville) ?? null;
  const dateFr = new Date(rencontre.date as string).toLocaleDateString("fr-FR");

  return {
    id: rencontre.id as number,
    saison: rencontre.saison as number,
    date: rencontre.date as string,
    categorie: rencontre.categorie as number,
    ville,
    label: [ville, `le ${dateFr}`, CATEGORIE_LABEL[rencontre.categorie as number]]
      .filter(Boolean)
      .join(" "),
  };
}

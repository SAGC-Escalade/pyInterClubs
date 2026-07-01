import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIE } from "@/lib/constants";

export const dynamic = "force-dynamic";

/**
 * Tranche 5 — Index des rapports (doc 09). Liste les rencontres (rapports par
 * rencontre) et les saisons (rapports cumulés). Réservé à l'admin (garde de
 * layout). Rendu serveur, lecture seule.
 */
export default async function ReportsIndexPage() {
  const supabase = createClient();
  const { data: rencontres } = await supabase
    .from("rencontre")
    .select("id, saison, date, categorie, club:club_id(nom, ville)")
    .order("date", { ascending: false });

  const rows = (rencontres ?? []).map((r) => {
    const club = Array.isArray(r.club) ? r.club[0] : r.club;
    return {
      id: r.id as number,
      saison: r.saison as number,
      date: new Date(r.date as string).toLocaleDateString("fr-FR"),
      categorie: r.categorie as number,
      ville: (club as { ville?: string } | null)?.ville ?? "",
    };
  });

  const saisons = [...new Set(rows.map((r) => r.saison))].sort((a, b) => b - a);

  return (
    <main>
      <h1 className="h4 mb-3">Rapports</h1>

      <h2 className="h6 text-muted">Par rencontre</h2>
      <table className="table table-sm align-middle">
        <thead>
          <tr>
            <th>Rencontre</th>
            <th className="text-end">Rapports</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                {r.ville} — {r.date}{" "}
                <span className="badge bg-light text-dark">{CATEGORIE[r.categorie]}</span>
              </td>
              <td className="text-end">
                <div className="btn-group btn-group-sm">
                  <Link className="btn btn-outline-primary" href={`/admin/reports/${r.id}/stats`}>
                    Stats
                  </Link>
                  <Link className="btn btn-outline-primary" href={`/admin/reports/${r.id}/teams`}>
                    Équipes
                  </Link>
                  <Link className="btn btn-outline-primary" href={`/admin/reports/${r.id}/ranking`}>
                    Individuel
                  </Link>
                  <Link
                    className="btn btn-outline-primary"
                    href={`/admin/reports/${r.id}/inscriptions`}
                  >
                    Inscriptions
                  </Link>
                </div>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={2} className="text-muted">
                Aucune rencontre.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <h2 className="h6 text-muted mt-4">Par saison</h2>
      <ul className="list-inline">
        {saisons.map((s) => (
          <li className="list-inline-item me-3" key={s}>
            <strong>{s}</strong> :{" "}
            <Link href={`/admin/reports/saison/${s}/ranking`}>Individuel</Link>
            {" · "}
            <Link href={`/admin/reports/saison/${s}/teams`}>Équipes</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

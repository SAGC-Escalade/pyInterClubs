import { notFound } from "next/navigation";
import { getRapportRencontre } from "@/lib/reports/data";
import PrintButton from "@/components/admin/reports/PrintButton";
import { ariaLabelClassementRow } from "@/lib/a11y/labels";

export const dynamic = "force-dynamic";

const MEDAILLE = ["gold", "silver", "bronze"];

/**
 * Tranche 5 — Classement individuel (doc 09 §2, port de RankingReportView).
 * Deux colonnes Femmes / Hommes, médailles pour le top 3.
 */
export default async function RankingReportPage({
  params,
}: {
  params: { id: string };
}) {
  const rapport = await getRapportRencontre(Number(params.id));
  if (!rapport) notFound();

  return (
    <main className="report">
      <div className="d-flex align-items-baseline justify-content-between mb-3">
        <h1 className="h4 mb-0">Classement individuel</h1>
        <div className="d-flex align-items-center gap-2">
          <span className="text-muted">{rapport.entete.label}</span>
          <PrintButton />
        </div>
      </div>

      <div className="row">
        {rapport.classements.map((col) => (
          <div className="col-md-6 no-page-break" key={col.titre}>
            <h2 className="h6">{col.titre}</h2>
            <table className="table table-sm">
              <thead>
                <tr>
                  <th scope="col" style={{ width: "3rem" }}>Rang</th>
                  <th scope="col">Grimpeur</th>
                  <th scope="col">Club</th>
                  <th scope="col" className="text-end">Points</th>
                </tr>
              </thead>
              <tbody>
                {col.scores.map((s) => (
                  <tr
                    key={s.score_id}
                    aria-label={ariaLabelClassementRow({
                      rang: s.rang,
                      prenom: s.grimpeur.prenom,
                      nom: s.grimpeur.nom,
                      points: s.points,
                    })}
                  >
                    <td>
                      {s.rang}
                      {s.rang <= 3 && (
                        <i className={`fa fa-medal ms-1 ${MEDAILLE[s.rang - 1]}`} aria-hidden />
                      )}
                    </td>
                    <td>
                      {s.grimpeur.nom} {s.grimpeur.prenom}
                    </td>
                    <td>{s.club_nom}</td>
                    <td className="text-end">{s.points}</td>
                  </tr>
                ))}
                {col.scores.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-muted">
                      Aucun grimpeur.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </main>
  );
}

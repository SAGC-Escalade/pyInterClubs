import { getRapportSaisonIndividuel } from "@/lib/reports/data";
import PrintButton from "@/components/admin/reports/PrintButton";

export const dynamic = "force-dynamic";

/**
 * Tranche 5 — Classement individuel de saison (doc 09 §3, port de
 * SeasonRankingReportView). Par catégorie (enfants/ado) × sexe, points cumulés.
 */
export default async function SeasonRankingPage({
  params,
}: {
  params: { saison: string };
}) {
  const saison = Number(params.saison);
  const classements = await getRapportSaisonIndividuel(saison);

  return (
    <main className="report">
      <div className="d-flex align-items-baseline justify-content-between mb-3">
        <h1 className="h4 mb-0">Classement individuel — Saison {saison}</h1>
        <PrintButton />
      </div>

      <div className="row">
        {classements.map((col) => (
          <div className="col-md-6 no-page-break mb-3" key={col.titre}>
            <h2 className="h6 text-capitalize">{col.titre}</h2>
            <table className="table table-sm">
              <thead>
                <tr>
                  <th style={{ width: "3rem" }}>Rang</th>
                  <th>Grimpeur</th>
                  <th>Club</th>
                  <th className="text-end">Points</th>
                </tr>
              </thead>
              <tbody>
                {col.lignes.map((l, i) => (
                  <tr key={i}>
                    <td>{l.rang}</td>
                    <td>{l.nom}</td>
                    <td>{l.club}</td>
                    <td className="text-end">{l.points}</td>
                  </tr>
                ))}
                {col.lignes.length === 0 && (
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

import { notFound } from "next/navigation";
import { getRapportRencontre } from "@/lib/reports/data";
import PrintButton from "@/components/admin/reports/PrintButton";

export const dynamic = "force-dynamic";

/**
 * Tranche 5 — Classement par équipes (doc 09 §2, port de TeamsReportView).
 * Équipes triées par points décroissants ; une colonne par voie.
 */
export default async function TeamsReportPage({
  params,
}: {
  params: { id: string };
}) {
  const rapport = await getRapportRencontre(Number(params.id));
  if (!rapport) notFound();

  return (
    <main className="report">
      <div className="d-flex align-items-baseline justify-content-between mb-3">
        <h1 className="h4 mb-0">Classement par équipes</h1>
        <div className="d-flex align-items-center gap-2">
          <span className="text-muted">{rapport.entete.label}</span>
          <PrintButton />
        </div>
      </div>

      {rapport.equipes.map((eq) => {
        const perfParVoie = (m: (typeof eq.membres)[number]) =>
          new Map(m.perfs.map((p) => [p.voie_id, p]));
        return (
          <div className="no-page-break mb-4" key={eq.id}>
            <h2 className="h6">
              {eq.club_nom} — Équipe {eq.numero}{" "}
              <span
                className={`badge ${eq.valide ? "bg-success" : "bg-primary"}`}
              >
                {eq.points} pts
              </span>
            </h2>
            <table className="table table-sm table-bordered">
              <thead>
                <tr>
                  <th>Grimpeur</th>
                  {rapport.voies.map((v) => (
                    <th key={v.id} className="text-center">
                      {v.nom}
                    </th>
                  ))}
                  <th className="text-end">Points</th>
                </tr>
              </thead>
              <tbody>
                {eq.membres.map((m) => {
                  const cells = perfParVoie(m);
                  return (
                    <tr key={m.score_id}>
                      <td>
                        {m.grimpeur.nom} {m.grimpeur.prenom}
                        {m.club_preteur_nom && (
                          <span className="badge bg-warning text-dark ms-1">
                            prêté {m.club_preteur_nom}
                          </span>
                        )}
                      </td>
                      {rapport.voies.map((v) => {
                        const p = cells.get(v.id);
                        return (
                          <td key={v.id} className="text-center" title={p?.etatLabel ?? ""}>
                            {p?.points ?? "—"}
                          </td>
                        );
                      })}
                      <td className="text-end fw-bold">{m.points}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </main>
  );
}

import { notFound } from "next/navigation";
import { getRapportRencontre } from "@/lib/reports/data";
import { categorieAge } from "@/lib/categorie";
import PrintButton from "@/components/admin/reports/PrintButton";

export const dynamic = "force-dynamic";

/**
 * Tranche 5 — Rapport des inscriptions (doc 09 §2, port de RegistrationReportView).
 * Grimpeurs dédoublonnés, groupés par club, triés club/nom/prénom.
 */
export default async function InscriptionsReportPage({
  params,
}: {
  params: { id: string };
}) {
  const rapport = await getRapportRencontre(Number(params.id));
  if (!rapport) notFound();

  const saison = rapport.entete.saison;

  return (
    <main className="report">
      <div className="d-flex align-items-baseline justify-content-between mb-3">
        <h1 className="h4 mb-0">Inscriptions</h1>
        <div className="d-flex align-items-center gap-2">
          <span className="text-muted">{rapport.entete.label}</span>
          <PrintButton />
        </div>
      </div>

      <div className="row">
        {rapport.inscrits.map((groupe) => (
          <div className="col-md-6 no-page-break mb-3" key={groupe.club}>
            <h2 className="h6">{groupe.club}</h2>
            <ol className="mb-0">
              {groupe.grimpeurs.map((g) => (
                <li key={g.id}>
                  {g.nom} {g.prenom}{" "}
                  <span className="text-muted">
                    ({categorieAge(g.annee_naissance, saison)})
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ))}
        {rapport.inscrits.length === 0 && (
          <p className="text-muted">Aucun grimpeur inscrit.</p>
        )}
      </div>
    </main>
  );
}

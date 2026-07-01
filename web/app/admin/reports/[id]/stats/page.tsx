import { notFound } from "next/navigation";
import { getRapportRencontre } from "@/lib/reports/data";
import { formatChrono } from "@/lib/juge/temps";
import PrintButton from "@/components/admin/reports/PrintButton";

export const dynamic = "force-dynamic";

const CAT_LABEL: Record<string, string> = {
  genre: "Passages par genre",
  etat: "Passages par état",
  type: "Passages par type",
};

/**
 * Tranche 5 — Rapport « Stats » (doc 09 §2, port de StatsReportView).
 * Séries de passages par voie / genre / état / type + temps de vitesse.
 * (Le graphe Chart.js de l'ancienne version est rendu ici en tableau lisible
 * et imprimable ; les mêmes séries alimenteraient un graphe côté client.)
 */
export default async function StatsReportPage({
  params,
}: {
  params: { id: string };
}) {
  const rapport = await getRapportRencontre(Number(params.id));
  if (!rapport) notFound();

  const { stats } = rapport;
  const categories: Array<"genre" | "etat" | "type"> = ["genre", "etat", "type"];

  return (
    <main className="report">
      <div className="d-flex align-items-baseline justify-content-between mb-3">
        <h1 className="h4 mb-0">Statistiques</h1>
        <div className="d-flex align-items-center gap-2">
          <span className="text-muted">{rapport.entete.label}</span>
          <PrintButton />
        </div>
      </div>

      {categories.map((cat) => {
        const series = stats.datasets.filter((d) => d.categorie === cat);
        if (series.length === 0) return null;
        return (
          <div className="no-page-break mb-4" key={cat}>
            <h2 className="h6">{CAT_LABEL[cat]}</h2>
            <table className="table table-sm table-bordered">
              <thead>
                <tr>
                  <th>{cat === "genre" ? "Genre" : cat === "type" ? "Type" : "État"}</th>
                  {stats.labels.map((l) => (
                    <th key={l} className="text-center">
                      {l}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {series.map((d) => (
                  <tr key={d.label}>
                    <td>{d.label}</td>
                    {d.data.map((n, i) => (
                      <td key={i} className="text-center">
                        {n || ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      <div className="no-page-break">
        <h2 className="h6">Temps de vitesse</h2>
        {stats.temps.length === 0 ? (
          <p className="text-muted">Aucun temps enregistré.</p>
        ) : (
          <ul className="list-inline">
            {stats.temps.map((t, i) => (
              <li className="list-inline-item me-3" key={i}>
                <span className="text-muted">{t.x} :</span> {formatChrono(t.y)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

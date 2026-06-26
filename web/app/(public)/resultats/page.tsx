import Ranking from "@/components/Ranking";
import { getRencontreEntete } from "@/lib/rencontre";

export const dynamic = "force-dynamic";

/**
 * Classement live public (lecture seule). Port de admin/resultats.html + Ranking.
 * Cf. doc 08 §3/§5. La rencontre est résolue côté serveur (doc 03 §3).
 */
export default async function ResultatsPage({
  searchParams,
}: {
  searchParams: { rencontre?: string };
}) {
  const entete = await getRencontreEntete(searchParams.rencontre);

  if (!entete) {
    return (
      <main className="container py-4">
        <div className="alert alert-info">Aucune rencontre à afficher.</div>
      </main>
    );
  }

  return (
    <main className="container py-4">
      <div className="d-flex align-items-baseline justify-content-between mb-3">
        <h1 className="h4 mb-0">Classement</h1>
        <span className="text-muted">{entete.label}</span>
      </div>
      <Ranking rencontreId={entete.id} />
    </main>
  );
}

/**
 * Page d'accueil — placeholder de démarrage.
 * À terme : tableau de bord conditionné par le rôle (admin / coach / juge),
 * équivalent de p_index.html (cf. doc 08 §1, doc 00 §2).
 */
export default function Home() {
  return (
    <main className="container py-5">
      <div className="p-5 mb-4 bg-body-tertiary rounded-3">
        <div className="container-fluid py-3">
          <h1 className="display-5 fw-bold">pyInterClubs</h1>
          <p className="col-md-8 fs-5 text-muted">
            Migration en cours vers Next.js + Supabase. Structure initialisée —
            voir <code>docs/spec/</code> pour les spécifications fonctionnelles.
          </p>
          <hr />
          <p className="mb-0">
            Prochaines étapes : appliquer les migrations Supabase
            (<code>web/supabase/migrations/</code>), puis construire les
            interfaces admin / coach / juge.
          </p>
        </div>
      </div>
    </main>
  );
}

import Link from "next/link";

/**
 * Tableau de bord admin — référentiels (Tranche 2) + rencontres (Tranche 3).
 * Démarrage/arrêt (provisioning coachs/juges, QR) à venir avec l'auth token.
 */
export default function AdminHome() {
  const cards = [
    {
      href: "/admin/rencontres",
      title: "Rencontres",
      desc: "Créer une rencontre et choisir la rencontre courante.",
    },
    { href: "/admin/clubs", title: "Clubs", desc: "Gérer les clubs participants." },
    {
      href: "/admin/grimpeurs",
      title: "Grimpeurs",
      desc: "Gérer les grimpeurs et leur club.",
    },
    {
      href: "/admin/voies",
      title: "Voies",
      desc: "Gérer les voies et leur barème de points.",
    },
  ];

  return (
    <>
      <h1 className="h4 mb-4">Administration</h1>
      <div className="row g-3">
        {cards.map((c) => (
          <div className="col-12 col-md-4" key={c.href}>
            <Link href={c.href} className="text-decoration-none">
              <div className="card h-100">
                <div className="card-body">
                  <h2 className="h5 card-title">{c.title}</h2>
                  <p className="card-text text-muted">{c.desc}</p>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </>
  );
}

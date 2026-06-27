import Link from "next/link";

/**
 * Barre de navigation globale (Bootstrap). Squelette — les entrées par rôle
 * (admin/coach/juge) seront ajoutées aux tranches suivantes (doc 08 §1).
 */
export default function Navbar() {
  return (
    <nav className="navbar navbar-expand-lg bg-primary" data-bs-theme="dark">
      <div className="container">
        <Link className="navbar-brand" href="/">
          pyInterClubs
        </Link>
        <div className="navbar-nav">
          <Link className="nav-link" href="/resultats">
            Résultats
          </Link>
          <Link className="nav-link" href="/admin">
            Admin
          </Link>
        </div>
      </div>
    </nav>
  );
}

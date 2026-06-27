"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const LINKS = [
  { href: "/admin", label: "Tableau de bord", exact: true },
  { href: "/admin/clubs", label: "Clubs" },
  { href: "/admin/grimpeurs", label: "Grimpeurs" },
  { href: "/admin/voies", label: "Voies" },
];

/**
 * Navigation de l'espace admin + déconnexion (doc 08 §1).
 */
export default function AdminNav({ email }: { email: string | null }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="d-flex align-items-center justify-content-between border-bottom pb-2 mb-4">
      <ul className="nav nav-pills">
        {LINKS.map((l) => (
          <li className="nav-item" key={l.href}>
            <Link
              className={`nav-link ${isActive(l.href, l.exact) ? "active" : ""}`}
              href={l.href}
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
      <div className="d-flex align-items-center gap-2">
        {email && <small className="text-muted d-none d-md-inline">{email}</small>}
        <button className="btn btn-outline-secondary btn-sm" onClick={logout}>
          Déconnexion
        </button>
      </div>
    </div>
  );
}

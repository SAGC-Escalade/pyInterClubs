import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/admin";
import AdminNav from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

/**
 * Garde de route pour l'espace admin. Toute page sous /admin exige un compte
 * Supabase Auth présent dans app_admin (doc 10 §2/§3). Sinon -> /login.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();
  if (!session) {
    redirect("/login?next=/admin");
  }

  return (
    <div className="container py-4">
      <AdminNav email={session.email} />
      {children}
    </div>
  );
}

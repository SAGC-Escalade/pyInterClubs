import { redirect } from "next/navigation";
import { getFieldSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * Garde de l'espace coach (doc 04 §1, doc 10 §2). Accessible aux coachs et à
 * l'admin ; sinon retour à l'accueil. Le middleware filtre déjà /leader, cette
 * garde sécurise le rendu serveur.
 */
export default async function LeaderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getFieldSession();
  if (!session || (session.role !== "coach" && session.role !== "admin")) {
    redirect("/");
  }
  return <div className="container py-4">{children}</div>;
}

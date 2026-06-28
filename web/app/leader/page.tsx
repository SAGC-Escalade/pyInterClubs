import { redirect } from "next/navigation";
import { getFieldSession } from "@/lib/auth/session";
import EquipesManager from "@/components/leader/EquipesManager";

export const dynamic = "force-dynamic";

export default async function LeaderPage() {
  const session = await getFieldSession();
  if (!session) redirect("/");

  // L'admin n'a pas de club/rencontre de coach : pas d'équipes à gérer ici.
  if (session.role !== "coach") {
    return (
      <p className="text-muted">
        Espace réservé aux coachs (connexion par QR de la rencontre).
      </p>
    );
  }

  return <EquipesManager rencontre={session.rencontre} club={session.club} />;
}

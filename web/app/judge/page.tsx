import { redirect } from "next/navigation";
import { getFieldSession } from "@/lib/auth/session";
import FeuilleScoring from "@/components/juge/FeuilleScoring";

export const dynamic = "force-dynamic";

export default async function JudgePage() {
  const session = await getFieldSession();
  if (!session) redirect("/");

  if (session.role !== "juge") {
    return (
      <p className="text-muted">
        Espace réservé aux juges (connexion par QR d&apos;affectation).
      </p>
    );
  }

  if (session.voies.length === 0) {
    return <p className="text-muted">Aucune voie ne vous est affectée.</p>;
  }

  return <FeuilleScoring voies={session.voies} rencontre={session.rencontre} />;
}

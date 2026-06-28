import { redirect } from "next/navigation";
import { getFieldSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * Garde de l'espace juge (doc 05 §1, doc 10 §2). Accessible aux juges et à
 * l'admin ; sinon retour à l'accueil. Le middleware filtre déjà /judge.
 */
export default async function JudgeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getFieldSession();
  if (!session || (session.role !== "juge" && session.role !== "admin")) {
    redirect("/");
  }
  return <div className="container py-4">{children}</div>;
}

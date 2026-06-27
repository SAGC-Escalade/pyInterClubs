import { Suspense } from "react";
import LoginForm from "@/components/LoginForm";

export const metadata = { title: "Connexion — pyInterClubs" };

export default function LoginPage() {
  return (
    <main className="container py-5" style={{ maxWidth: 420 }}>
      <h1 className="h4 mb-4">Connexion administrateur</h1>
      <Suspense fallback={<p className="text-muted">Chargement…</p>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}

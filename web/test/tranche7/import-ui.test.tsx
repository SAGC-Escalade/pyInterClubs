import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// React Query piloté à la main (pas de réseau).
const useQuery = vi.fn();
const useMutation = vi.fn();
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => useQuery(),
  useMutation: () => useMutation(),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

import ImportGrimpeursManager from "@/components/admin/ImportGrimpeursManager";

/**
 * Tranche 7 — câblage IHM import : upload CSV → aperçu (dry-run) rendu.
 * La logique pure (parse/plan) est couverte par climbers.test.ts ; on vérifie ici
 * que l'aperçu affiche les compteurs et l'action déduite pour un grimpeur nouveau.
 */
describe("ImportGrimpeursManager (aperçu)", () => {
  function setup() {
    useQuery.mockReturnValue({ data: [], isLoading: false });
    useMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });
    return render(<ImportGrimpeursManager />);
  }

  it("affiche le formulaire d'upload avec les colonnes attendues", () => {
    setup();
    expect(
      screen.getByText(/Colonnes attendues/i),
    ).toBeInTheDocument();
  });

  it("montre l'aperçu (create) après lecture d'un CSV", async () => {
    const { container } = setup();
    const csv = [
      "Structure,Numéro de licence,Nom complet,Date de naissance",
      "CAF BORDEAUX,111,DUPONT Emma,12/05/2015",
    ].join("\n");
    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = new File([csv], "grimpeurs.csv", { type: "text/csv" });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByText("Créer")).toBeInTheDocument());
    expect(screen.getByText("DUPONT")).toBeInTheDocument();
    // 1 à créer, dont 1 fille (Emma)
    expect(screen.getByText(/1 F \/ 0 H/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Appliquer l'import/i }),
    ).toBeInTheDocument();
  });
});

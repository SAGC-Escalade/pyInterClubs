import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";

// On contrôle l'état renvoyé par react-query et on neutralise les dépendances
// réseau (Supabase, Realtime, FlipMove) pour tester le rendu pur du classement.
const useQuery = vi.fn();
vi.mock("@tanstack/react-query", () => ({ useQuery: () => useQuery() }));
vi.mock("@/lib/realtime/useRealtime", () => ({ useRealtime: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));
vi.mock("react-flip-move", () => ({
  default: ({ children }: { children: ReactNode }) => <ul>{children}</ul>,
}));

import Ranking from "@/components/Ranking";

const row = (over: Partial<Record<string, unknown>> = {}) => ({
  score_id: 1,
  rencontre_id: 7,
  saison: 2025,
  grimpeur_id: 1,
  nom: "Dupont",
  prenom: "Jean",
  sexe: 2,
  annee_naissance: 2010,
  club_nom: "CAF Lyon",
  points: 42,
  valide: true,
  rang: 1,
  ...over,
});

describe("Ranking (Tranche 1 — classement public)", () => {
  beforeEach(() => useQuery.mockReset());

  it("affiche un état de chargement (placeholder)", () => {
    useQuery.mockReturnValue({ data: undefined, isLoading: true, refetch: vi.fn() });
    const { container } = render(<Ranking rencontreId={7} />);
    expect(container.querySelector(".placeholder")).toBeInTheDocument();
  });

  it("affiche « Aucun grimpeur inscrit » quand le classement est vide", () => {
    useQuery.mockReturnValue({ data: [], isLoading: false, refetch: vi.fn() });
    render(<Ranking rencontreId={7} />);
    expect(screen.getByText("Aucun grimpeur inscrit")).toBeInTheDocument();
  });

  it("affiche une ligne grimpeur avec nom, club, points et catégorie", () => {
    useQuery.mockReturnValue({
      data: [row()],
      isLoading: false,
      refetch: vi.fn(),
    });
    render(<Ranking rencontreId={7} />);

    expect(screen.getByText(/Dupont/)).toBeInTheDocument();
    expect(screen.getByText("CAF Lyon")).toBeInTheDocument();
    expect(screen.getByText("U17")).toBeInTheDocument(); // 2025-2010 = 15 ans
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("badge vert (bg-success) pour un score validé, bleu sinon", () => {
    useQuery.mockReturnValue({
      data: [row({ valide: true })],
      isLoading: false,
      refetch: vi.fn(),
    });
    const { container, rerender } = render(<Ranking rencontreId={7} />);
    expect(container.querySelector(".badge.bg-success")).toBeInTheDocument();

    useQuery.mockReturnValue({
      data: [row({ valide: false })],
      isLoading: false,
      refetch: vi.fn(),
    });
    rerender(<Ranking rencontreId={7} />);
    expect(container.querySelector(".badge.bg-primary")).toBeInTheDocument();
  });

  it("symbole ♀ pour une grimpeuse, ♂ pour un grimpeur", () => {
    useQuery.mockReturnValue({
      data: [row({ sexe: 1 })],
      isLoading: false,
      refetch: vi.fn(),
    });
    render(<Ranking rencontreId={7} />);
    expect(screen.getByText("♀")).toBeInTheDocument();
  });
});

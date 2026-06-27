import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ZonesEditor, { type Zone } from "@/components/admin/ZonesEditor";

/**
 * Tranche 2 — éditeur du barème `zones` d'une voie. L'index de ligne = `etat`,
 * l'ordre est significatif. `points` : vide -> null, entier -> number,
 * expression (vitesse) -> string.
 */
function setup(zones: Zone[]) {
  const onChange = vi.fn();
  const utils = render(<ZonesEditor zones={zones} onChange={onChange} />);
  return { onChange, ...utils };
}

describe("ZonesEditor", () => {
  it("affiche l'index (etat) de chaque zone dans l'ordre", () => {
    setup([
      { label: "Chute", points: null },
      { label: "Zone", points: 5 },
      { label: "Top", points: 10 },
    ]);
    const rows = screen.getAllByRole("row").slice(1); // hors en-tête
    expect(rows[0]).toHaveTextContent("0");
    expect(rows[1]).toHaveTextContent("1");
    expect(rows[2]).toHaveTextContent("2");
  });

  it("ajoute une zone vide (points = null)", async () => {
    const { onChange } = setup([{ label: "Top", points: 10 }]);
    await userEvent.click(screen.getByRole("button", { name: /Ajouter une zone/ }));
    expect(onChange).toHaveBeenCalledWith([
      { label: "Top", points: 10 },
      { label: "", points: null },
    ]);
  });

  it("convertit un champ points vide en null", async () => {
    const { onChange } = setup([{ label: "Zone", points: 5 }]);
    const pointsInput = screen.getByDisplayValue("5");
    await userEvent.clear(pointsInput);
    expect(onChange).toHaveBeenLastCalledWith([{ label: "Zone", points: null }]);
  });

  it("convertit un entier saisi en number", () => {
    // Composant contrôlé : on émet la valeur complète en un seul change.
    const { onChange } = setup([{ label: "Zone", points: null }]);
    const pointsInput = screen.getByPlaceholderText(/non réalisé/);
    fireEvent.change(pointsInput, { target: { value: "7" } });
    expect(onChange).toHaveBeenLastCalledWith([{ label: "Zone", points: 7 }]);
  });

  it("conserve une expression vitesse comme string ({rank})", () => {
    const { onChange } = setup([{ label: "Top", points: null }]);
    const pointsInput = screen.getByPlaceholderText(/non réalisé/);
    fireEvent.change(pointsInput, { target: { value: "60-{rank}" } });
    expect(onChange).toHaveBeenLastCalledWith([
      { label: "Top", points: "60-{rank}" },
    ]);
  });

  it("supprime une zone", async () => {
    const { onChange } = setup([
      { label: "Chute", points: null },
      { label: "Top", points: 10 },
    ]);
    const supprimer = screen.getAllByTitle("Supprimer");
    await userEvent.click(supprimer[0]);
    expect(onChange).toHaveBeenCalledWith([{ label: "Top", points: 10 }]);
  });

  it("déplace une zone vers le bas (l'ordre/etat change)", async () => {
    const { onChange } = setup([
      { label: "Chute", points: null },
      { label: "Top", points: 10 },
    ]);
    await userEvent.click(screen.getAllByTitle("Descendre")[0]);
    expect(onChange).toHaveBeenCalledWith([
      { label: "Top", points: 10 },
      { label: "Chute", points: null },
    ]);
  });

  it("désactive « Monter » sur la 1ʳᵉ ligne et « Descendre » sur la dernière", () => {
    setup([
      { label: "Chute", points: null },
      { label: "Top", points: 10 },
    ]);
    const monter = screen.getAllByTitle("Monter");
    const descendre = screen.getAllByTitle("Descendre");
    expect(monter[0]).toBeDisabled();
    expect(descendre[descendre.length - 1]).toBeDisabled();
  });
});

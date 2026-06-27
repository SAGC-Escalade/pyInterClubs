import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Autocomplete, { type Option } from "@/components/Autocomplete";

/**
 * Tranche 2 — champ d'autocomplétion (sélection de club, etc.). Filtrage côté
 * client insensible à la casse sur le libellé ; sélection -> valeur numérique.
 */
const OPTIONS: Option[] = [
  { value: 1, label: "CAF Lyon" },
  { value: 2, label: "CAF Paris" },
  { value: 3, label: "Grenoble Escalade" },
];

describe("Autocomplete", () => {
  it("affiche le libellé de l'option sélectionnée", () => {
    render(
      <Autocomplete options={OPTIONS} value={2} onChange={() => {}} />,
    );
    expect(screen.getByRole("textbox")).toHaveValue("CAF Paris");
  });

  it("ouvre la liste au focus et propose les options", async () => {
    render(<Autocomplete options={OPTIONS} value={null} onChange={() => {}} />);
    await userEvent.click(screen.getByRole("textbox"));
    expect(screen.getByText("CAF Lyon")).toBeInTheDocument();
    expect(screen.getByText("Grenoble Escalade")).toBeInTheDocument();
  });

  it("filtre les options sans tenir compte de la casse", async () => {
    render(<Autocomplete options={OPTIONS} value={null} onChange={() => {}} />);
    const input = screen.getByRole("textbox");
    await userEvent.click(input);
    await userEvent.type(input, "caf");
    expect(screen.getByText("CAF Lyon")).toBeInTheDocument();
    expect(screen.getByText("CAF Paris")).toBeInTheDocument();
    expect(screen.queryByText("Grenoble Escalade")).not.toBeInTheDocument();
  });

  it("remonte la valeur sélectionnée via onChange", async () => {
    const onChange = vi.fn();
    render(<Autocomplete options={OPTIONS} value={null} onChange={onChange} />);
    const input = screen.getByRole("textbox");
    await userEvent.click(input);
    await userEvent.type(input, "Grenoble");
    await userEvent.click(screen.getByText("Grenoble Escalade"));
    expect(onChange).toHaveBeenLastCalledWith(3);
  });

  it("réinitialise la valeur quand l'utilisateur modifie le texte", async () => {
    const onChange = vi.fn();
    render(<Autocomplete options={OPTIONS} value={1} onChange={onChange} />);
    const input = screen.getByRole("textbox");
    await userEvent.click(input);
    await userEvent.type(input, "x");
    expect(onChange).toHaveBeenCalledWith(null);
  });
});

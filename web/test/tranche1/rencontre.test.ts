import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeSupabaseMock } from "../helpers/supabaseMock";

// Le helper importe createClient depuis le module serveur : on le mocke.
const createClient = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: () => createClient() }));

import { getRencontreEntete } from "@/lib/rencontre";

const RENCONTRE = {
  id: 7,
  saison: 2025,
  date: "2025-03-15",
  categorie: 3,
  club: { ville: "Lyon" },
};

describe("getRencontreEntete (Tranche 1 — résolution rencontre publique)", () => {
  beforeEach(() => {
    createClient.mockReset();
  });

  it("utilise le paramètre d'URL `rencontre` quand il est fourni", async () => {
    const supabase = makeSupabaseMock({
      tableResult: { rencontre: { data: RENCONTRE } },
    });
    createClient.mockReturnValue(supabase);

    const entete = await getRencontreEntete("7");

    expect(entete?.id).toBe(7);
    // Le fallback default_rencontre_id ne doit pas être appelé.
    expect(supabase.rpc).not.toHaveBeenCalled();
    expect(supabase.from).toHaveBeenCalledWith("rencontre");
  });

  it("retombe sur default_rencontre_id() sans paramètre", async () => {
    const supabase = makeSupabaseMock({
      rpcResult: { default_rencontre_id: { data: 7 } },
      tableResult: { rencontre: { data: RENCONTRE } },
    });
    createClient.mockReturnValue(supabase);

    const entete = await getRencontreEntete();

    expect(supabase.rpc).toHaveBeenCalledWith("default_rencontre_id");
    expect(entete?.id).toBe(7);
  });

  it("construit le libellé « ville le JJ/MM/AAAA Catégorie »", async () => {
    const supabase = makeSupabaseMock({
      tableResult: { rencontre: { data: RENCONTRE } },
    });
    createClient.mockReturnValue(supabase);

    const entete = await getRencontreEntete("7");

    expect(entete?.label).toBe("Lyon le 15/03/2025 Mixte");
    expect(entete?.ville).toBe("Lyon");
  });

  it("gère le club renvoyé sous forme de tableau (jointure PostgREST)", async () => {
    const supabase = makeSupabaseMock({
      tableResult: {
        rencontre: { data: { ...RENCONTRE, club: [{ ville: "Paris" }] } },
      },
    });
    createClient.mockReturnValue(supabase);

    const entete = await getRencontreEntete("7");

    expect(entete?.ville).toBe("Paris");
  });

  it("renvoie null quand aucune rencontre n'existe (param + fallback vides)", async () => {
    const supabase = makeSupabaseMock({
      rpcResult: { default_rencontre_id: { data: null } },
    });
    createClient.mockReturnValue(supabase);

    expect(await getRencontreEntete()).toBeNull();
  });

  it("renvoie null si l'id résolu ne correspond à aucune ligne", async () => {
    const supabase = makeSupabaseMock({
      tableResult: { rencontre: { data: null } },
    });
    createClient.mockReturnValue(supabase);

    expect(await getRencontreEntete("999")).toBeNull();
  });

  it("ignore un paramètre non numérique et passe par le fallback", async () => {
    const supabase = makeSupabaseMock({
      rpcResult: { default_rencontre_id: { data: 7 } },
      tableResult: { rencontre: { data: RENCONTRE } },
    });
    createClient.mockReturnValue(supabase);

    await getRencontreEntete("abc");

    expect(supabase.rpc).toHaveBeenCalledWith("default_rencontre_id");
  });
});

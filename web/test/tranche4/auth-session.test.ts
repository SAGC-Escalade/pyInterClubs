import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeSupabaseMock } from "../helpers/supabaseMock";

const createClient = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: () => createClient() }));

import { getFieldSession } from "@/lib/auth/session";

/**
 * Tranche 4 — résolution de la session « terrain » (coach/juge/admin) côté
 * serveur, équivalent cible de pyInterClubsMiddleware (doc 10 §2). Calqué sur
 * getAdminSession : on lit le rôle et le périmètre via des fonctions
 * SECURITY DEFINER (fn_current_role / fn_current_rencontre / fn_current_club /
 * fn_current_voies) qui consultent les tables coach/juge selon le JWT courant.
 */
const USER = { id: "u-1", email: "coach@example.com" };

describe("getFieldSession (Tranche 4 — résolution de rôle terrain)", () => {
  beforeEach(() => createClient.mockReset());

  it("renvoie null si aucun utilisateur n'est connecté", async () => {
    createClient.mockReturnValue(
      makeSupabaseMock({ authUser: { data: { user: null } } }),
    );
    expect(await getFieldSession()).toBeNull();
  });

  it("renvoie null si fn_current_role est vide (aucun rôle)", async () => {
    createClient.mockReturnValue(
      makeSupabaseMock({
        authUser: { data: { user: USER } },
        rpcResult: { fn_current_role: { data: null } },
      }),
    );
    expect(await getFieldSession()).toBeNull();
  });

  it("renvoie null si fn_current_role remonte une erreur", async () => {
    createClient.mockReturnValue(
      makeSupabaseMock({
        authUser: { data: { user: USER } },
        rpcResult: { fn_current_role: { data: null, error: { message: "boom" } } },
      }),
    );
    expect(await getFieldSession()).toBeNull();
  });

  it("renvoie un rôle admin (sans club ni voies)", async () => {
    createClient.mockReturnValue(
      makeSupabaseMock({
        authUser: { data: { user: USER } },
        rpcResult: { fn_current_role: { data: "admin" } },
      }),
    );
    expect(await getFieldSession()).toEqual({ role: "admin", userId: "u-1" });
  });

  it("renvoie le périmètre d'un coach (rencontre + club)", async () => {
    createClient.mockReturnValue(
      makeSupabaseMock({
        authUser: { data: { user: USER } },
        rpcResult: {
          fn_current_role: { data: "coach" },
          fn_current_rencontre: { data: 7 },
          fn_current_club: { data: 3 },
        },
      }),
    );
    expect(await getFieldSession()).toEqual({
      role: "coach",
      userId: "u-1",
      rencontre: 7,
      club: 3,
    });
  });

  it("renvoie le périmètre d'un juge (rencontre + voies affectées)", async () => {
    createClient.mockReturnValue(
      makeSupabaseMock({
        authUser: { data: { user: USER } },
        rpcResult: {
          fn_current_role: { data: "juge" },
          fn_current_rencontre: { data: 7 },
          fn_current_voies: { data: [11, 12, 13] },
        },
      }),
    );
    expect(await getFieldSession()).toEqual({
      role: "juge",
      userId: "u-1",
      rencontre: 7,
      voies: [11, 12, 13],
    });
  });

  it("consulte fn_current_role via RPC", async () => {
    const supabase = makeSupabaseMock({
      authUser: { data: { user: USER } },
      rpcResult: { fn_current_role: { data: "admin" } },
    });
    createClient.mockReturnValue(supabase);
    await getFieldSession();
    expect(supabase.rpc).toHaveBeenCalledWith("fn_current_role");
  });
});

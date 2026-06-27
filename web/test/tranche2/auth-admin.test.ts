import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeSupabaseMock } from "../helpers/supabaseMock";

const createClient = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: () => createClient() }));

import { getAdminSession } from "@/lib/auth/admin";

const USER = { id: "u-1", email: "admin@example.com" };

describe("getAdminSession (Tranche 2 — garde admin)", () => {
  beforeEach(() => createClient.mockReset());

  it("renvoie null si aucun utilisateur n'est connecté", async () => {
    createClient.mockReturnValue(
      makeSupabaseMock({ authUser: { data: { user: null } } }),
    );
    expect(await getAdminSession()).toBeNull();
  });

  it("renvoie null si l'utilisateur n'est pas admin (fn_is_admin = false)", async () => {
    createClient.mockReturnValue(
      makeSupabaseMock({
        authUser: { data: { user: USER } },
        rpcResult: { fn_is_admin: { data: false } },
      }),
    );
    expect(await getAdminSession()).toBeNull();
  });

  it("renvoie null si fn_is_admin remonte une erreur", async () => {
    createClient.mockReturnValue(
      makeSupabaseMock({
        authUser: { data: { user: USER } },
        rpcResult: { fn_is_admin: { data: null, error: { message: "boom" } } },
      }),
    );
    expect(await getAdminSession()).toBeNull();
  });

  it("renvoie userId/email pour un admin authentifié", async () => {
    createClient.mockReturnValue(
      makeSupabaseMock({
        authUser: { data: { user: USER } },
        rpcResult: { fn_is_admin: { data: true } },
      }),
    );
    expect(await getAdminSession()).toEqual({
      userId: "u-1",
      email: "admin@example.com",
    });
  });
});

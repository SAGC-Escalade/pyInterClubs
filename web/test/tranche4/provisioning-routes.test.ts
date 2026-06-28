import { describe, it, expect, vi, beforeEach } from "vitest";

// Garde admin mockée + client privilégié espionné.
const getAdminSession = vi.fn();
vi.mock("@/lib/auth/admin", () => ({ getAdminSession: () => getAdminSession() }));

const createAdminClient = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => createAdminClient(),
}));

import { POST as demarrer } from "@/app/admin/rencontres/[id]/demarrer/route";
import { POST as arreter } from "@/app/admin/rencontres/[id]/arreter/route";
import { POST as affecterJuge } from "@/app/admin/juges/route";

/**
 * Tranche 4 — les route handlers de provisioning (service_role) sont réservés à
 * l'admin : un non-admin est refusé (403) AVANT toute opération privilégiée.
 */
describe("Provisioning — garde admin des route handlers", () => {
  beforeEach(() => {
    getAdminSession.mockReset();
    createAdminClient.mockReset();
    getAdminSession.mockResolvedValue(null); // non-admin
  });

  it("démarrer : refuse un non-admin (403, sans client privilégié)", async () => {
    const res = await demarrer(new Request("http://localhost/x", { method: "POST" }), {
      params: { id: "7" },
    });
    expect(res.status).toBe(403);
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("arrêter : refuse un non-admin (403, sans client privilégié)", async () => {
    const res = await arreter(new Request("http://localhost/x", { method: "POST" }), {
      params: { id: "7" },
    });
    expect(res.status).toBe(403);
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("affecter juge : refuse un non-admin (403, sans client privilégié)", async () => {
    const res = await affecterJuge(
      new Request("http://localhost/admin/juges", {
        method: "POST",
        body: JSON.stringify({ rencontreId: 7, nom: "Dupont", voieIds: [11] }),
        headers: { "content-type": "application/json" },
      }),
    );
    expect(res.status).toBe(403);
    expect(createAdminClient).not.toHaveBeenCalled();
  });
});

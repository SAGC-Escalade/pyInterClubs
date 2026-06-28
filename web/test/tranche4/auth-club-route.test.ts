import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeSupabaseMock } from "../helpers/supabaseMock";

const createAdminClient = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => createAdminClient(),
}));

import { GET } from "@/app/auth/club/route";

/**
 * Tranche 4 — route d'échange token -> session (doc 10 §2). Le QR pointe vers
 * /auth/club?token=… : on retrouve le coach/juge via le client service_role,
 * on établit la session et on redirige vers l'espace adéquat (coach -> /leader,
 * juge -> /judge). On teste le contrat observable (statut + Location), pas
 * l'établissement bas-niveau de la session Supabase.
 */

// Client admin contrôlé : `from(...)` via makeSupabaseMock (lookups coach/juge),
// et `auth.admin.*` permissif (n'importe quel appel réussit) pour ne pas coupler
// le test à l'API exacte choisie pour poser la session.
function adminClient(opts: {
  tableResult?: Record<string, { data: unknown; error?: unknown }>;
}) {
  const base = makeSupabaseMock(opts);
  const adminProxy = new Proxy(
    {},
    {
      get: () =>
        vi.fn(() =>
          Promise.resolve({
            data: { user: { id: "u-1" }, properties: {}, session: {} },
            error: null,
          }),
        ),
    },
  );
  return { ...base, auth: { ...base.auth, admin: adminProxy } };
}

function request(token?: string): Request {
  const url = token
    ? `http://localhost/auth/club?token=${encodeURIComponent(token)}`
    : "http://localhost/auth/club";
  return new Request(url);
}

function location(res: Response): string {
  return new URL(res.headers.get("location") ?? "http://localhost/").pathname;
}

const COACH = { id: 10, rencontre_id: 7, club_id: 3, token: "tok-coach" };
const JUGE = { id: 20, rencontre_id: 7, nom: "Dupont", token: "tok-juge" };

describe("GET /auth/club (Tranche 4 — échange token)", () => {
  beforeEach(() => createAdminClient.mockReset());

  it("refuse une requête sans token (400)", async () => {
    createAdminClient.mockReturnValue(adminClient({}));
    const res = await GET(request());
    expect(res.status).toBe(400);
  });

  it("refuse un token inconnu (coach et juge introuvables)", async () => {
    createAdminClient.mockReturnValue(
      adminClient({
        tableResult: { coach: { data: null }, juge: { data: null } },
      }),
    );
    const res = await GET(request("inconnu"));
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("connecte un coach et redirige vers /leader", async () => {
    createAdminClient.mockReturnValue(
      adminClient({ tableResult: { coach: { data: COACH } } }),
    );
    const res = await GET(request("tok-coach"));
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    expect(location(res)).toBe("/leader");
  });

  it("connecte un juge et redirige vers /judge", async () => {
    createAdminClient.mockReturnValue(
      adminClient({
        // coach introuvable -> on bascule sur la table juge
        tableResult: { coach: { data: null }, juge: { data: JUGE } },
      }),
    );
    const res = await GET(request("tok-juge"));
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    expect(location(res)).toBe("/judge");
  });
});

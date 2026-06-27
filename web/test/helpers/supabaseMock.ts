import { vi } from "vitest";

/**
 * Fabrique un faux client Supabase pour les helpers serveur/client.
 *
 * - `from(table)` renvoie un builder chaînable (select/eq/order/...) dont le
 *   résultat final (await / maybeSingle) est `tableResult[table]`.
 * - `rpc(name)` renvoie `rpcResult[name]`.
 * - `auth.getUser()` renvoie `authUser`.
 *
 * Chaque méthode chaînée renvoie le builder lui-même, sauf les terminales
 * (`maybeSingle`, `single`) qui résolvent le résultat. Le builder est aussi
 * « thenable » pour supporter `await query` directement.
 */
export function makeSupabaseMock(opts: {
  tableResult?: Record<string, { data: unknown; error?: unknown }>;
  rpcResult?: Record<string, { data: unknown; error?: unknown }>;
  authUser?: { data: { user: unknown } };
}) {
  const { tableResult = {}, rpcResult = {}, authUser } = opts;

  const from = vi.fn((table: string) => {
    const result = tableResult[table] ?? { data: null, error: null };
    const builder: Record<string, unknown> = {};
    for (const m of ["select", "eq", "order", "in", "limit", "ilike"]) {
      builder[m] = vi.fn(() => builder);
    }
    builder.maybeSingle = vi.fn(() => Promise.resolve(result));
    builder.single = vi.fn(() => Promise.resolve(result));
    // Permet `await supabase.from(...).select(...)`.
    builder.then = (resolve: (v: unknown) => unknown) => resolve(result);
    return builder;
  });

  const rpc = vi.fn((name: string) =>
    Promise.resolve(rpcResult[name] ?? { data: null, error: null }),
  );

  return {
    from,
    rpc,
    auth: {
      getUser: vi.fn(() => Promise.resolve(authUser ?? { data: { user: null } })),
    },
  };
}

"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Fournisseurs globaux côté client.
 * - TanStack Query : cache de données (équivalent de React Query actuel, doc 08).
 * À venir : un provider Realtime (useRealtime sur supabase.channel, doc 07)
 * en remplacement de SSEProvider.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            staleTime: 30_000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

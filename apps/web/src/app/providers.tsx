"use client";

import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import type { PublicUser } from "@satsharks/types";
import { ApiError } from "@/lib/api";
import { isMeQuery, ME_QUERY_KEY, readRememberedUser, rememberUser } from "@/lib/auth";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => {
    const client: QueryClient = new QueryClient({
      defaultOptions: {
        queries: {
          refetchOnWindowFocus: false,
          // Retry only failures that might succeed next time (network, 5xx). A 4xx answer such as
          // "forbidden" or "not found" will not change, and retrying it delays showing the error.
          retry: (failureCount, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 2,
        },
      },
      queryCache: new QueryCache({
        // A 401/403 means the session is not what this page thinks it is (signed out, or another
        // account signed in from a different tab). Re-read who is signed in so the menu follows.
        onError: (error, query) => {
          if (!isMeQuery(query.queryKey) && error instanceof ApiError && (error.status === 401 || error.status === 403)) {
            void client.invalidateQueries({ queryKey: ME_QUERY_KEY });
          }
        },
      }),
    });
    return client;
  });

  // Show the remembered account straight away instead of "Checking your session"; the check still
  // runs (the data is marked stale) and its answer replaces it. Done after mount, so the server
  // render and the first client render match. Every later answer is remembered for next time.
  useEffect(() => {
    const cache = queryClient.getQueryCache();
    const remembered = readRememberedUser();
    if (remembered && queryClient.getQueryData(ME_QUERY_KEY) === undefined) {
      queryClient.setQueryData(ME_QUERY_KEY, remembered, { updatedAt: 0 });
      // Keeps a check that is already running rather than starting it again.
      void queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY }, { cancelRefetch: false });
    }
    return cache.subscribe((event) => {
      if (event.type !== "updated" || !isMeQuery(event.query.queryKey)) return;
      const { status, data } = event.query.state;
      if (status === "success") rememberUser(data as PublicUser | null);
    });
  }, [queryClient]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

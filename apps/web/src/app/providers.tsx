"use client";

import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ApiError } from "@/lib/api";
import { isMeQuery, ME_QUERY_KEY } from "@/lib/auth";

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
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

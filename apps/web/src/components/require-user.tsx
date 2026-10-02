"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import type { Permission, PublicUser } from "@satsharks/types";
import { useMe } from "@/lib/auth";
import { Notice, Spinner } from "./ui";

// Client-side gate for signed-in pages. This only decides what to render: the API enforces the
// same rules on every request, so hiding a page here is never the security boundary.
export function RequireUser({
  permission,
  children,
}: {
  permission?: Permission;
  children: (user: PublicUser) => ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: user, isLoading, error } = useMe();

  useEffect(() => {
    if (!isLoading && !error && user === null) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, error, user, router, pathname]);

  if (error) return <Notice tone="error">{error.message}</Notice>;
  if (isLoading || !user) return <Spinner label="Checking your session" />;
  if (permission && !user.permissions.includes(permission)) {
    return <Notice tone="error">You do not have access to this page.</Notice>;
  }
  return <>{children(user)}</>;
}

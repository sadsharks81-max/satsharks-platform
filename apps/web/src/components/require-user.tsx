"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import type { Permission, PublicUser } from "@satsharks/types";
import { isStaffUser, useMe } from "@/lib/auth";
import { Notice, Spinner } from "./ui";

// Client-side gate for signed-in pages. This only decides what to render: the API enforces the
// same rules on every request, so hiding a page here is never the security boundary.
// `studentOnly`: practice pages. Admin and staff accounts are sent to the admin portal instead.
export function RequireUser({
  permission,
  studentOnly = false,
  children,
}: {
  permission?: Permission;
  studentOnly?: boolean;
  children: (user: PublicUser) => ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: user, isLoading, error } = useMe();
  const redirectStaff = studentOnly && isStaffUser(user);

  useEffect(() => {
    if (!isLoading && !error && user === null) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    } else if (redirectStaff) {
      router.replace("/admin");
    }
  }, [isLoading, error, user, router, pathname, redirectStaff]);

  if (error) return <Notice tone="error">{error.message}</Notice>;
  if (isLoading || !user) return <Spinner label="Checking your session" />;
  if (redirectStaff) return <Spinner label="Opening the admin portal" />;
  if (permission && !user.permissions.includes(permission)) {
    return <Notice tone="error">You do not have access to this page.</Notice>;
  }
  return <>{children(user)}</>;
}

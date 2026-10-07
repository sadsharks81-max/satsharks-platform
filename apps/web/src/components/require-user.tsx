"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import type { Permission, PublicUser } from "@satsharks/types";
import { homePath, isSigningOut, isStaffUser, useMe } from "@/lib/auth";
import { Notice, Spinner } from "./ui";

// Client-side gate for signed-in pages. This only decides what to render: the API enforces the
// same rules on every request, so hiding a page here is never the security boundary.
// `studentOnly`: practice pages. Admin and staff accounts are sent to the admin portal instead.
// A page the account may not open (an admin page for a student) sends it to its own home, so a
// student who signs in where an admin was never lands on "no access".
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
  const wrongAccount = !!user && ((studentOnly && isStaffUser(user)) || (!!permission && !user.permissions.includes(permission)));

  useEffect(() => {
    if (!isLoading && !error && user === null) {
      // Signing out from this page: the sign-out goes to the home page; do not also open the
      // login form with this page as the place to return to.
      if (isSigningOut()) router.replace("/");
      else router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    } else if (user && wrongAccount) {
      router.replace(homePath(user));
    }
  }, [isLoading, error, user, router, pathname, wrongAccount]);

  if (error) return <Notice tone="error">{error.message}</Notice>;
  if (isLoading || !user) return <Spinner label="Checking your session" />;
  if (wrongAccount) return <Spinner label={isStaffUser(user) ? "Opening the admin portal" : "Opening your dashboard"} />;
  return <>{children(user)}</>;
}

"use client";

import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { RequireUser } from "@/components/require-user";

// Every admin page sits beside the admin sidebar (a tab strip on smaller screens). The pages check
// their own, finer permissions; this gate keeps the menu away from students.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RequireUser permission="admin:access">
      {(user) => (
        <div className="lg:flex lg:items-start lg:gap-6">
          <AdminSidebar user={user} />
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      )}
    </RequireUser>
  );
}

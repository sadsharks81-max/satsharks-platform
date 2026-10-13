"use client";

import type { ReactNode } from "react";
import { RequireUser } from "@/components/require-user";
import { StudentSidebar } from "@/components/student-sidebar";

// Every student page sits beside the student sidebar (a tab strip on smaller screens). Admin and
// staff accounts are sent to the admin portal, as on each page.
export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <RequireUser studentOnly>
      {(user) => (
        <div className="lg:flex lg:items-start lg:gap-6">
          <StudentSidebar user={user} />
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      )}
    </RequireUser>
  );
}

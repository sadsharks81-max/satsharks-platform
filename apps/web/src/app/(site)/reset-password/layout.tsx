import type { Metadata } from "next";
import type { ReactNode } from "react";

// The reset token is in this page's address: never pass it on in a Referer header.
export const metadata: Metadata = { title: "Reset password", referrer: "no-referrer" };

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}

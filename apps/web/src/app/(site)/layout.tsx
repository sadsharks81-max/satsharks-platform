import type { ReactNode } from "react";
import { Nav } from "@/components/nav";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-8">{children}</main>
    </>
  );
}

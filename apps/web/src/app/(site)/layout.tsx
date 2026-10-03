import type { ReactNode } from "react";
import { Nav } from "@/components/nav";

// Same content width and side padding as the navigation bar: up to 1700px, 16px sides on
// phones and 32px from tablets up.
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-[1700px] px-4 pb-12 pt-4 md:px-8">{children}</main>
    </>
  );
}

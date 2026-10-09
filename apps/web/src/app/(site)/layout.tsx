import type { ReactNode } from "react";
import { Announcements } from "@/components/announcements";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";

// Same content width and side padding as the navigation bar: up to 1700px, 16px sides on
// phones and 32px from tablets up. The footer sits at the bottom even on short pages.
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-[1700px] flex-1 px-4 pb-12 pt-4 md:px-8">
        <Announcements />
        {children}
      </main>
      <Footer />
    </div>
  );
}

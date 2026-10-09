import { Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { Footer } from "@/components/footer";

// The landing page has its own layout: its blue hero runs edge to edge with the navigation bar on
// it (the page renders the nav itself), so it does not use the (site) layout's padded container.
// Plus Jakarta Sans is the landing design's typeface; the rest of the site keeps Roboto.
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], display: "swap" });

export default function LandingLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`flex min-h-screen flex-col bg-[#F7F8FC] text-[#0F1535] ${jakarta.className}`}>
      <main className="flex-1 overflow-x-clip">{children}</main>
      <Footer />
    </div>
  );
}

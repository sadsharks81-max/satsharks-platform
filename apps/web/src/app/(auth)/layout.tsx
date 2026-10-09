import { Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { Footer } from "@/components/footer";

// Log in, sign up and the password pages share the landing page's look: a blue brand pane beside
// the form (drawn by AuthShell, which also carries the small navigation), so they do not use the
// (site) layout's nav bar and padded container. Same typeface as the landing page.
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], display: "swap" });

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`flex min-h-screen flex-col bg-[#F7F8FC] text-[#0F1535] ${jakarta.className}`}>
      <main className="flex flex-1 flex-col overflow-x-clip">{children}</main>
      <Footer />
    </div>
  );
}

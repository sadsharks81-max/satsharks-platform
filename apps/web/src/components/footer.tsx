import Link from "next/link";

const links = [
  { href: "/pricing", label: "Pricing" },
  { href: "/sat-dates", label: "SAT Dates" },
  { href: "/faq", label: "FAQ" },
  { href: "/guides", label: "SAT Guides" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/refund", label: "Refund Policy" },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-900 bg-white">
      {/* Right padding from tablets up keeps the links clear of the floating WhatsApp button. */}
      <div className="mx-auto flex w-full max-w-[1700px] flex-col gap-3 px-4 py-6 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:pr-24 md:pl-8">
        <p>
          <span className="font-bold text-brand-500">SAT Sharks</span> · Digital SAT practice
        </p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="font-medium hover:text-black hover:underline">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}

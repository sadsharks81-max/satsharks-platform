import Link from "next/link";

// Shown on exams, tests and ways of practising that are kept for paid plans (Admin → Access).

function LockIcon({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 11h12v10H6V11zm2 0V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

export function PaidBadge() {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-amber-500 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
      <LockIcon className="h-3 w-3" />
      Paid
    </span>
  );
}

export function UnlockButton({ label = "Unlock with a paid plan", className = "" }: { label?: string; className?: string }) {
  return (
    <Link
      href="/pricing"
      className={`flex h-[42px] items-center justify-center gap-2 rounded-[10px] border border-brand-500 bg-white px-4 text-[14px] font-bold text-brand-500 hover:bg-brand-50 ${className}`}
    >
      <LockIcon className="h-4 w-4" />
      {label}
    </Link>
  );
}

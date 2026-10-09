"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { homePath, isStaffUser, useMe } from "@/lib/auth";
import { Announcements } from "./announcements";
import { Logo } from "./logo";

// Shared building blocks for the sign-in, sign-up and password pages, drawn from the Claude Design
// file: a blue brand pane (headline, a small test-screen card, three features) beside the form on
// wide screens; on phones a short blue bar with the logo and links sits above the form instead.

const POINTS = [
  {
    title: "Real past papers",
    text: "Digital SAT questions sorted by section, topic, skill and difficulty.",
    icon: (
      <>
        <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
        <path d="M14 3v6h6M8 13h8M8 17h5" />
      </>
    ),
  },
  { title: "Adaptive mocks", text: "Module 2 gets harder or easier from your Module 1 result, as on test day.", icon: <path d="M3 17l6-6 4 4 8-8M15 7h6v6" /> },
  {
    title: "Review every answer",
    text: "See the correct answer and the time you spent on each question.",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M8 12l3 3 5-6" />
      </>
    ),
  },
];

const ICONS = {
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z" />
    </>
  ),
};
export type FieldIcon = keyof typeof ICONS;

function Arrow({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

// Pricing plus Log In / Sign Up, or a way back into the app for someone already signed in.
// Nothing account-related is shown while the session is being checked, so links never flash.
function AuthNav({ tone }: { tone: "light" | "brand" }) {
  const pathname = usePathname();
  const { data: user, isLoading } = useMe();
  const plain = tone === "light" ? "text-[#2E3557] hover:bg-[#E9EDFF] hover:text-brand-700" : "text-white/90 hover:bg-white/10 hover:text-white";
  const current = tone === "light" ? "bg-[#E9EDFF] font-extrabold text-brand-700" : "bg-white/15 font-extrabold text-white";
  const strong = tone === "light" ? "bg-brand-500 text-white hover:bg-brand-600" : "bg-white text-brand-700 hover:bg-brand-50";
  const base = "flex min-h-[44px] items-center rounded-xl px-3 text-sm font-bold transition sm:px-4 sm:text-[15px]";

  return (
    <nav aria-label="Account" className="flex flex-wrap items-center justify-end gap-1 sm:gap-1.5">
      <Link href="/pricing" className={`${base} ${plain} hidden sm:flex`}>
        Pricing
      </Link>
      {isLoading ? null : user ? (
        <Link href={homePath(user)} className={`${base} ${strong} font-extrabold`}>
          {isStaffUser(user) ? "Admin portal" : "Dashboard"}
        </Link>
      ) : (
        <>
          <Link href="/login" aria-current={pathname === "/login" ? "page" : undefined} className={`${base} ${pathname === "/login" ? current : plain}`}>
            Log In
          </Link>
          <Link href="/register" aria-current={pathname === "/register" ? "page" : undefined} className={`${base} ${strong} font-extrabold sm:px-5`}>
            Sign Up
          </Link>
        </>
      )}
    </nav>
  );
}

// The test-screen card in the brand pane: decoration only.
function MiniTestCard() {
  const choices = [
    ["A", "3"],
    ["B", "5"],
    ["C", "8"],
    ["D", "15"],
  ];
  return (
    <div aria-hidden className="ml-2 w-full max-w-[400px] -rotate-3 self-start">
      <div className="landing-bob relative">
        <div className="overflow-hidden rounded-[18px] bg-white text-[#0F1535] shadow-[0_40px_70px_-30px_rgba(8,12,48,0.75)]">
          <div className="flex items-center justify-between px-4 py-3">
            <strong className="text-[13px]">Math: Module 1</strong>
            <div className="flex flex-col items-center gap-0.5">
              <strong className="text-[15px] tabular-nums">31:58</strong>
              <span className="rounded-full border-[1.5px] border-[#0F1535] px-2 text-[9px] font-bold">Hide</span>
            </div>
            <span className="font-serif text-[13px] font-semibold">x²</span>
          </div>
          <div className="h-[3px] bg-[repeating-linear-gradient(90deg,#E11D48_0_22px,transparent_22px_30px,#F59E0B_30px_52px,transparent_52px_60px,#16A34A_60px_82px,transparent_82px_90px,#0891B2_90px_112px,transparent_112px_120px,#3448C5_120px_142px,transparent_142px_150px,#9333EA_150px_172px,transparent_172px_180px)]" />
          <div className="flex flex-col gap-2.5 px-4 pb-[18px] pt-3.5">
            <p className="m-0 font-serif text-[15px]">
              If 3<em>x</em> + 5 = 20, what is the value of <em>x</em>?
            </p>
            <div className="grid grid-cols-2 gap-2">
              {choices.map(([letter, value]) => {
                const picked = letter === "B";
                return (
                  <div
                    key={letter}
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm ${picked ? "border-2 border-brand-500 shadow-[0_0_0_3px_#E3E8FF]" : "border-[1.5px] border-[#0F1535]"}`}
                  >
                    <span
                      className={`flex h-[18px] w-[18px] items-center justify-center rounded-full text-[10px] font-extrabold ${picked ? "bg-brand-500 text-white" : "border-[1.5px] border-[#0F1535]"}`}
                    >
                      {letter}
                    </span>
                    {value}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="absolute -bottom-[22px] -right-7 flex items-center gap-2.5 rounded-[14px] border-[1.5px] border-[#0F1535] bg-white px-3.5 py-2.5 text-[#0F1535] shadow-[0_16px_34px_-16px_rgba(8,12,48,0.6)]">
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-brand-500">
            <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 17l6-6 4 4 8-8M15 7h6v6" />
            </svg>
          </span>
          <span className="flex flex-col">
            <span className="text-[10px] font-extrabold tracking-[0.08em] text-[#4D5577]">MODULE 2</span>
            <strong className="text-[13px] text-brand-700">Adapts to your score</strong>
          </span>
        </div>
      </div>
    </div>
  );
}

const BRAND_BACKGROUND = "bg-[radial-gradient(700px_420px_at_30%_0%,#4A5FE0_0%,rgba(52,72,197,0)_70%),linear-gradient(180deg,#3448C5_0%,#2A3BB0_55%,#22309A_100%)]";

function BrandPane() {
  return (
    <aside className={`relative hidden flex-col gap-10 overflow-hidden px-[clamp(24px,5vw,72px)] pb-12 pt-7 text-white lg:flex ${BRAND_BACKGROUND}`}>
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:52px_52px] [mask-image:radial-gradient(ellipse_80%_70%_at_40%_35%,#000_25%,transparent_80%)]"
      />
      <div aria-hidden className="absolute -right-[220px] -top-40 h-[520px] w-[520px] rounded-full border border-white/12" />
      <div aria-hidden className="absolute -right-[120px] -top-20 h-[340px] w-[340px] rounded-full bg-white/6" />
      <div aria-hidden className="absolute -bottom-[220px] -left-[200px] h-[460px] w-[460px] rounded-full border border-white/10" />

      <Link href="/" className="relative self-start text-white">
        <Logo className="h-11 w-auto" />
      </Link>

      <div className="relative flex max-w-[560px] flex-1 flex-col justify-center gap-9">
        <p className="m-0 text-balance text-[clamp(36px,3.6vw,52px)] font-extrabold leading-[1.04] tracking-[-0.045em]">
          Practise the Digital SAT the way it is{" "}
          <span className="relative whitespace-nowrap text-[#C9D3FF]">
            really taken.
            <svg aria-hidden viewBox="0 0 300 18" preserveAspectRatio="none" className="absolute -bottom-2.5 left-0 h-3.5 w-full">
              <path d="M3 12 C 60 2, 120 2, 160 9 S 250 16, 297 5" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </span>
        </p>

        <MiniTestCard />

        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {POINTS.map((point) => (
            <li key={point.title} className="flex items-start gap-3.5 rounded-[18px] border border-white/18 bg-white/9 px-[18px] py-4">
              <span aria-hidden className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[11px] bg-white">
                <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="#3448C5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {point.icon}
                </svg>
              </span>
              <div className="flex flex-col gap-[3px]">
                <strong className="text-base">{point.title}</strong>
                <span className="text-sm leading-normal text-[#DCE2FF]">{point.text}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

// The Log in / Sign up switch at the top of the two account forms.
function AuthTabs({ tab }: { tab: "login" | "register" }) {
  const item = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-[42px] items-center justify-center rounded-[10px] text-[15px] transition ${
        active ? "bg-white font-extrabold text-[#0F1535] shadow-[0_4px_10px_-6px_rgba(31,45,140,0.4)]" : "font-bold text-[#4D5577] hover:text-[#0F1535]"
      }`}
    >
      {label}
    </Link>
  );
  return (
    <div className="grid grid-cols-2 rounded-[14px] bg-[#EEF1F8] p-[5px]">
      {item("/login", "Log in", tab === "login")}
      {item("/register", "Sign up", tab === "register")}
    </div>
  );
}

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  tab,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  tab?: "login" | "register";
}) {
  return (
    <div className="flex flex-1 flex-col lg:grid lg:grid-cols-[1.08fr_1fr]">
      <BrandPane />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Phones and tablets: the brand pane's logo and the links, on a short blue bar. */}
        <div className={`flex items-center justify-between gap-3 px-4 py-3 text-white md:px-8 lg:hidden ${BRAND_BACKGROUND}`}>
          <Link href="/" className="text-white">
            <Logo className="h-9 w-auto" />
          </Link>
          <AuthNav tone="brand" />
        </div>
        <div className="hidden px-[clamp(20px,4vw,48px)] pt-6 lg:block">
          <AuthNav tone="light" />
        </div>

        <div className="flex flex-1 items-start justify-center px-4 pb-14 pt-6 sm:items-center sm:px-8 lg:pt-4">
          <div className="w-full max-w-[460px]">
            <Announcements />
            <div className="landing-rise flex flex-col gap-6 rounded-[28px] border border-[#DDE2F1] bg-white p-[clamp(22px,5vw,44px)] shadow-[0_40px_80px_-50px_rgba(31,45,140,0.45)]">
              {tab && <AuthTabs tab={tab} />}
              <div className="flex flex-col gap-2">
                <h1 className="m-0 text-[28px] font-extrabold leading-[1.1] tracking-[-0.04em] sm:text-[34px]">{title}</h1>
                {subtitle && <p className="m-0 text-[15px] text-[#4D5577] sm:text-base">{subtitle}</p>}
              </div>
              {children}
              {footer &&
                (tab === "login" ? (
                  <>
                    <div aria-hidden className="flex items-center gap-3.5">
                      <span className="h-px flex-1 bg-[#E2E6F2]" />
                      <span className="text-[13px] font-semibold text-[#6B7392]">or</span>
                      <span className="h-px flex-1 bg-[#E2E6F2]" />
                    </div>
                    <p className="m-0 text-center text-[15px] text-[#4D5577]">{footer}</p>
                  </>
                ) : (
                  <p className="m-0 border-t border-[#E2E6F2] pt-6 text-center text-[15px] text-[#4D5577]">{footer}</p>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const control = (invalid: boolean, icon: boolean) =>
  `block h-[54px] w-full rounded-[14px] border-[1.5px] bg-[#F7F8FC] ${icon ? "pl-[46px]" : "pl-4"} pr-4 text-base text-[#0F1535] outline-none transition placeholder:text-[#7B83A3] focus:bg-white focus:ring-4 disabled:opacity-60 ${
    invalid ? "border-red-500 focus:border-red-500 focus:ring-red-100" : "border-[#CBD2E6] hover:border-[#9AA6D6] focus:border-brand-500 focus:ring-[#E3E8FF]"
  }`;

function IconSlot({ icon }: { icon?: FieldIcon }) {
  if (!icon) return null;
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2"
      fill="none"
      stroke="#6B7392"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICONS[icon]}
    </svg>
  );
}

function FieldShell({ id, label, error, hint, action, children }: { id: string; label: string; error?: string | null; hint?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-bold">
          {label}
        </label>
        {action}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-2 text-[13px] font-semibold text-red-700">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-2 text-[13px] text-[#4D5577]">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string | null; hint?: ReactNode; action?: ReactNode; icon?: FieldIcon };

export function TextField({ label, error, hint, action, icon, className = "", ...props }: TextFieldProps) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} action={action}>
      <div className="relative">
        <IconSlot icon={icon} />
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={`${control(!!error, !!icon)} ${className}`}
          {...props}
        />
      </div>
    </FieldShell>
  );
}

export function PasswordField({ label, error, hint, action, icon = "lock", ...props }: Omit<TextFieldProps, "type">) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} action={action}>
      <div className="relative">
        <IconSlot icon={icon} />
        <input
          id={id}
          type={visible ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={`${control(!!error, !!icon)} pr-[54px]`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute right-[5px] top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-[10px] text-[#4D5577] transition hover:bg-[#EEF1F8] hover:text-[#0F1535] focus-visible:outline-2 focus-visible:outline-brand-500"
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className={`h-5 w-5 ${visible ? "text-brand-500" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {visible ? (
              <path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2" />
            ) : (
              <>
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                <circle cx="12" cy="12" r="3" />
              </>
            )}
          </svg>
        </button>
      </div>
    </FieldShell>
  );
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string | null; hint?: ReactNode; icon?: FieldIcon };

export function SelectField({ label, error, hint, icon, children, ...props }: SelectFieldProps) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <div className="relative">
        <IconSlot icon={icon} />
        <select
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={`${control(!!error, !!icon)} cursor-pointer appearance-none pr-[46px]`}
          {...props}
        >
          {children}
        </select>
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="pointer-events-none absolute right-[18px] top-1/2 h-4 w-4 -translate-y-1/2"
          fill="none"
          stroke="#4D5577"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
    </FieldShell>
  );
}

// The main button on every auth form, and a link with the same look (used for "Request a new link").
export const authButton =
  "flex min-h-14 w-full cursor-pointer items-center justify-center gap-2.5 rounded-2xl bg-brand-500 text-[17px] font-extrabold text-white shadow-[0_12px_28px_-14px_rgba(31,45,140,0.7)] transition hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-[0_18px_36px_-14px_rgba(31,45,140,0.7)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0";
export const authButtonOutline =
  "flex min-h-14 w-full cursor-pointer items-center justify-center rounded-2xl border-[1.5px] border-[#CBD2E6] bg-white text-base font-bold text-[#0F1535] transition hover:border-brand-500 hover:bg-[#F7F8FC]";

export function SubmitButton({ loading, loadingLabel, children, disabled }: { loading: boolean; loadingLabel: string; children: ReactNode; disabled?: boolean }) {
  return (
    <button type="submit" disabled={loading || disabled} className={`${authButton} mt-1`}>
      {loading && <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
      {loading ? loadingLabel : children}
      {!loading && <Arrow />}
    </button>
  );
}

export function FormAlert({ tone, children }: { tone: "error" | "success"; children: ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-[14px] border px-4 py-3 text-sm ${tone === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800"}`}
    >
      {children}
    </div>
  );
}

export const authLink = "font-extrabold text-brand-500 hover:text-brand-700 hover:underline";

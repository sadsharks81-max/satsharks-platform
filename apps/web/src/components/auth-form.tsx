"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { USER_REGION_LABELS, regionForCountry, type PublicUser } from "@satsharks/types";
import { api, ApiError } from "@/lib/api";
import { homePath, useSwitchUser } from "@/lib/auth";
import { countryOptions, LOCAL_COUNTRY_CODE } from "@/lib/countries";
import { AuthShell, FormAlert, PasswordField, SelectField, SubmitButton, TextField, authLink } from "./auth-ui";

// Only same-site paths are accepted, so ?next= cannot be used to send someone to another website.
// Without one, students go to their dashboard and admins to the admin portal.
function safeNext(next: string | null, user: PublicUser): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : homePath(user);
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Values {
  name: string;
  email: string;
  password: string;
  country: string;
}
type Errors = Partial<Record<keyof Values, string>>;

function validate(values: Values, isRegister: boolean): Errors {
  const errors: Errors = {};
  if (isRegister) {
    if (values.name.trim().length < 2) errors.name = "Enter your name (at least 2 characters).";
    if (!values.country) errors.country = "Choose your country.";
  }
  if (!values.email.trim()) errors.email = "Enter your email address.";
  else if (!EMAIL_PATTERN.test(values.email.trim())) errors.email = "Enter a valid email address, like name@example.com.";
  if (!values.password) errors.password = "Enter your password.";
  else if (isRegister && values.password.length < 8) errors.password = "Use at least 8 characters.";
  else if (values.password.length > 72) errors.password = "Use at most 72 characters.";
  return errors;
}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const switchUser = useSwitchUser();
  const isRegister = mode === "register";
  const [values, setValues] = useState<Values>({ name: "", email: "", password: "", country: "" });
  const [errors, setErrors] = useState<Errors>({});
  // Fields are checked once the student has left them (or tried to submit), not while typing.
  const [touched, setTouched] = useState<Partial<Record<keyof Values, boolean>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Country names come from the browser's locale data, which differs slightly from the server's,
  // so the list is built after the page has loaded (building it on the server breaks hydration).
  const [countries, setCountries] = useState<{ code: string; name: string }[]>([]);
  useEffect(() => {
    if (isRegister) setCountries(countryOptions());
  }, [isRegister]);
  const notice = searchParams.get("reset") === "1" ? "Your password has been changed. Log in with your new password." : null;

  const change = (field: keyof Values) => (value: string) => {
    const next = { ...values, [field]: value };
    setValues(next);
    if (touched[field]) setErrors(validate(next, isRegister));
  };
  const blur = (field: keyof Values) => () => {
    setTouched((current) => ({ ...current, [field]: true }));
    setErrors(validate(values, isRegister));
  };
  const shown = (field: keyof Values) => (touched[field] ? errors[field] : undefined);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validate(values, isRegister);
    setErrors(found);
    setTouched({ name: true, email: true, password: true, country: true });
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    setFormError(null);
    try {
      const { user } = await api<{ user: PublicUser }>(`/api/auth/${mode}`, {
        method: "POST",
        body: {
          ...(isRegister ? { name: values.name.trim(), country: values.country } : {}),
          email: values.email.trim(),
          password: values.password,
        },
      });
      switchUser(user);
      router.push(safeNext(searchParams.get("next"), user));
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 409 && isRegister) {
        setErrors((current) => ({ ...current, email: "An account with this email already exists. Log in instead." }));
      } else {
        setFormError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
      }
      setSubmitting(false);
    }
  }

  const region = values.country ? regionForCountry(values.country) : null;

  return (
    <AuthShell
      title={isRegister ? "Create your account" : "Welcome back"}
      subtitle={isRegister ? "Start practising with real Digital SAT papers. It's free." : "Log in to continue your practice."}
      footer={
        isRegister ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className={authLink}>
              Log in
            </Link>
          </>
        ) : (
          <>
            New to SAT Sharks?{" "}
            <Link href="/register" className={authLink}>
              Create a free account
            </Link>
          </>
        )
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {notice && <FormAlert tone="success">{notice}</FormAlert>}
        {formError && <FormAlert tone="error">{formError}</FormAlert>}

        {isRegister && (
          <TextField
            label="Full name"
            name="name"
            autoComplete="name"
            maxLength={80}
            placeholder="Your name"
            value={values.name}
            onChange={(event) => change("name")(event.target.value)}
            onBlur={blur("name")}
            error={shown("name")}
          />
        )}
        <TextField
          label="Email address"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={254}
          placeholder="name@example.com"
          value={values.email}
          onChange={(event) => change("email")(event.target.value)}
          onBlur={blur("email")}
          error={shown("email")}
        />
        <PasswordField
          label="Password"
          name="password"
          autoComplete={isRegister ? "new-password" : "current-password"}
          maxLength={72}
          placeholder={isRegister ? "At least 8 characters" : "Your password"}
          value={values.password}
          onChange={(event) => change("password")(event.target.value)}
          onBlur={blur("password")}
          error={shown("password")}
          hint={isRegister ? "At least 8 characters." : undefined}
          action={
            isRegister ? undefined : (
              <Link href="/forgot-password" className="text-[13px] font-bold text-brand-500 hover:underline">
                Forgot password?
              </Link>
            )
          }
        />
        {isRegister && (
          <SelectField
            label="Country"
            name="country"
            autoComplete="country"
            value={values.country}
            onChange={(event) => change("country")(event.target.value)}
            onBlur={blur("country")}
            error={shown("country")}
            hint={region ? `${USER_REGION_LABELS[region]} account: plans are shown in ${region === "local" ? "PKR" : "USD"}.` : "Used to show prices in your currency."}
          >
            <option value="" disabled>
              Select your country
            </option>
            <option value={LOCAL_COUNTRY_CODE}>Pakistan</option>
            <option disabled>──────────</option>
            {countries.filter((option) => option.code !== LOCAL_COUNTRY_CODE).map((option) => (
              <option key={option.code} value={option.code}>
                {option.name}
              </option>
            ))}
          </SelectField>
        )}

        <SubmitButton loading={submitting} loadingLabel={isRegister ? "Creating account…" : "Logging in…"}>
          {isRegister ? "Create account" : "Log in"}
        </SubmitButton>

        {isRegister && (
          <p className="text-center text-[13px] leading-relaxed text-slate-500">
            By creating an account you agree to our{" "}
            <Link href="/terms" target="_blank" className="font-medium text-slate-700 underline hover:text-black">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" target="_blank" className="font-medium text-slate-700 underline hover:text-black">
              Privacy Policy
            </Link>
            .
          </p>
        )}
      </form>
    </AuthShell>
  );
}

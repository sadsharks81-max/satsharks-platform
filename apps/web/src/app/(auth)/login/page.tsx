import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Log in", description: "Log in to SAT Sharks to continue your Digital SAT practice.", alternates: { canonical: "/login" } };

export default function LoginPage() {
  // useSearchParams (inside AuthForm) needs a Suspense boundary to be prerendered.
  return (
    <Suspense>
      <AuthForm mode="login" />
    </Suspense>
  );
}

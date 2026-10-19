import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Sign up free",
  description: "Create a free SAT Sharks account: real past Digital SAT papers in a Bluebook-style test screen, scored out of 1600. No card needed.",
  alternates: { canonical: "/register" },
};

export default function RegisterPage() {
  return (
    <Suspense>
      <AuthForm mode="register" />
    </Suspense>
  );
}

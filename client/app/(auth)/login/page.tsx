import type { Metadata } from "next";
import { Suspense } from "react";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign in · CAFS DryChain",
};

export default function LoginPage() {
  // LoginForm reads search params (the inactivity notice), which needs a boundary.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

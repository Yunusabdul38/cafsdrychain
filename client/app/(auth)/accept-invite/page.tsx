import type { Metadata } from "next";
import { Suspense } from "react";
import AcceptInviteForm from "@/components/auth/AcceptInviteForm";

export const metadata: Metadata = {
  title: "Set up your account · CAFS DryChain",
};

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={null}>
      <AcceptInviteForm />
    </Suspense>
  );
}

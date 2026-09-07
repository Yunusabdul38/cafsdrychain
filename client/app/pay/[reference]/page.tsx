import type { Metadata } from "next";
import CheckoutLive from "@/components/payment/CheckoutLive";

export const metadata: Metadata = {
  title: "Pay drying fee · CAFS DryChain",
};

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  return <CheckoutLive reference={reference} />;
}

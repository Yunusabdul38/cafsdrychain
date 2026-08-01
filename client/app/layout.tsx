import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import Providers from "@/components/providers/Providers";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const magnetik = localFont({
  src: [
    {
      path: "../public/fonts/Magnetik-Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/Magnetik-RegularItalic.otf",
      weight: "400",
      style: "italic",
    },
    {
      path: "../public/fonts/Magnetik-Medium.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/Magnetik-MediumItalic.otf",
      weight: "500",
      style: "italic",
    },
    {
      path: "../public/fonts/Magnetik-SemiBold.otf",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--font-magnetik",
});

export const metadata: Metadata = {
  title: "CAFS DryChain — Every Batch. Verified. On-Chain.",
  description:
    "DryChain brings end-to-end traceability to solar-dried produce, tracking every batch from collection to delivery with an immutable record secured on the Base blockchain.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistMono.variable} ${magnetik.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}

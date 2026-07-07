import Link from "next/link";
import Logo from "@/components/ui/Logo";

export default function VerifyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f6f8f4]">
      <header className="border-b border-black/[0.08] bg-white">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-full px-4 py-2 text-sm font-medium text-brand-dark hover:bg-mint"
            >
              Home
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-brand-dark px-5 py-2 text-sm font-semibold text-white hover:bg-brand-darker"
            >
              Login
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        {children}
      </main>

      <footer className="border-t border-black/[0.08] bg-white">
        <div className="mx-auto max-w-4xl px-4 py-6 text-center text-sm text-muted sm:px-6">
          © {new Date().getFullYear()} CAFS DryChain · Secured on Base
        </div>
      </footer>
    </div>
  );
}

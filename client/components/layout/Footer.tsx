import Image from "next/image";

const columns = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "#how-it-works" },
      { label: "Features", href: "#features" },
      { label: "Verify a product", href: "#verify" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Contact", href: "#contact" },
      { label: "Login", href: "#login" },
      // { label: "Home", href: "#home" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-brand-dark text-white">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5">
              <Image
                src="/img/drychain-logo.png"
                alt="CAFS DryChain logo"
                width={40}
                height={40}
                className="h-9 w-9 rounded-full object-cover"
              />
              <span className="flex flex-col leading-none">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">
                  CAFS
                </span>
                <span className="-mt-0.5 text-lg font-semibold text-white">
                  DryChain
                </span>
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/60">
              End-to-end traceability for solar-dried produce every batch
              verified and secured on the Base blockchain.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-white/50">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-white/80 transition-colors hover:text-brand"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-sm text-white/50 sm:flex-row">
          <p>© {new Date().getFullYear()} CAFS DryChain. All rights reserved.</p>
          <p className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-brand" />
            Secured on Base
          </p>
        </div>
      </div>
    </footer>
  );
}

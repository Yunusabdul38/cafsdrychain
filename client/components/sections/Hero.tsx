export default function Hero() {
  return (
    <section id="home" className="relative isolate overflow-hidden">
      {/* Sky tint for text legibility */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#2f8ae0]/30 via-transparent to-transparent" />

      <div className="mx-auto flex min-h-[92vh] max-w-6xl flex-col items-center justify-center px-6 pt-20 pb-24 text-center">
        <span
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/15 px-4 py-1.5 text-xs font-medium text-white backdrop-blur-sm sm:text-sm"
          style={{ animation: "rise 0.7s ease-out both" }}
        >
          <span className="h-2 w-2 rounded-full bg-brand" />
          Traceability secured on the Base blockchain
        </span>

        <h1
          className="max-w-4xl text-4xl font-semibold leading-[1.02] tracking-tight text-white drop-shadow-[0_4px_24px_rgba(6,28,48,0.35)] sm:text-6xl md:text-7xl"
          style={{ animation: "rise 0.8s ease-out 0.05s both" }}
        >
          Every Batch.
          <br />
          Verified. On-Chain.
        </h1>

        <p
          className="mt-6 max-w-2xl text-md leading-relaxed text-white/90 drop-shadow-[0_2px_12px_rgba(6,28,48,0.4)] sm:text-xl"
          style={{ animation: "rise 0.8s ease-out 0.12s both" }}
        >
          DryChain brings end-to-end traceability to solar-dried produce,
          tracking every batch from collection to delivery, with an immutable
          record secured on the Base blockchain.
        </p>

        <div
          className="mt-9 flex items-center gap-3"
          style={{ animation: "rise 0.8s ease-out 0.2s both" }}
        >
          <a
            href="/login"
            className="w-full rounded-full bg-white px-9 py-4 text-base font-semibold text-brand-dark shadow-lg transition-transform hover:-translate-y-0.5 sm:w-auto"
          >
            Login
          </a>
          <a
            href="/verify"
            className="w-full rounded-full bg-brand px-9 py-4 text-base font-semibold text-white shadow-lg transition-transform hover:-translate-y-0.5 sm:w-auto"
          >
            Verify
          </a>
        </div>
      </div>
    </section>
  );
}

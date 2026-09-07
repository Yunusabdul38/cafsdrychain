import { QrIcon, ArrowRightIcon, ShieldIcon } from "@/components/icons";

export default function Verify() {
  return (
    <section id="verify" className="bg-white py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-brand-dark px-6 py-14 sm:px-14 sm:py-16">


          <div className="relative grid items-center gap-12 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold text-white ring-1 ring-white/20">
                <ShieldIcon className="h-4 w-4" /> Verification
              </span>
              <h2 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Verify a product in seconds
              </h2>
              <p className="mt-4 max-w-lg text-lg text-white/75">
                Scan the QR code on any package or enter its Batch ID to reveal
                the complete, on chain history, from the farm it came from to
                the moment it was delivered.
              </p>

              {/* mock input */}
              <form className="mt-8 flex flex-col gap-3 sm:flex-row">
                <label htmlFor="batch-id" className="sr-only">
                  Batch ID
                </label>
                <input
                  id="batch-id"
                  type="text"
                  placeholder="Enter Batch ID e.g. DRY-2K7F-9X1"
                  className="w-full rounded-full border border-white/15 bg-white/10 px-6 py-4 text-base text-white placeholder:text-white/50 outline-none transition focus:border-brand focus:bg-white/15"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-brand-hover"
                >
                  Verify <ArrowRightIcon className="h-5 w-5" />
                </button>
              </form>
              <p className="mt-3 text-sm text-white/50">
                No account needed. Verification is open to everyone.
              </p>
            </div>

            {/* QR mock card */}
            <div className="flex justify-center lg:justify-end">
              <div
                className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
                style={{ animation: "floaty 6s ease-in-out infinite" }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
                      Batch verified
                    </p>
                    <p className="mt-1 font-mono text-sm text-brand-dark">
                      DRY-2K7F-9X1
                    </p>
                  </div>
                  <span className="flex h-9 items-center gap-1.5 rounded-full bg-mint px-3 text-xs font-semibold text-brand">
                    <span className="h-2 w-2 rounded-full bg-brand" /> On chain
                  </span>
                </div>

                <div className="mt-5 flex items-center justify-center rounded-2xl bg-mint py-8">
                  <QrIcon className="h-28 w-28 text-brand-dark" />
                </div>

                <dl className="mt-5 space-y-2.5 text-sm">
                  {[
                    ["Product", "Sun dried Mango"],
                    ["Source", "Ola Farms · Oyo"],
                    ["Moisture", "12%"],
                    ["Status", "Delivered"],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between border-b border-black/5 pb-2.5 last:border-0 last:pb-0"
                    >
                      <dt className="text-muted">{label}</dt>
                      <dd className="font-medium text-brand-dark">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

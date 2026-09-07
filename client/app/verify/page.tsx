import { Card } from "@/components/ui/Card";
import VerifyLookup from "@/components/verify/VerifyLookup";
import { ShieldIcon, QrIcon, LinkIcon } from "@/components/icons";

const points = [
  { icon: QrIcon, title: "Scan or enter", text: "Use the Batch ID printed on the package." },
  { icon: ShieldIcon, title: "See the full history", text: "Source, drying, storage, and delivery." },
  { icon: LinkIcon, title: "Verified on chain", text: "Backed by an immutable blockchain record." },
];

export default function VerifyPage() {
  return (
    <div>
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-mint px-4 py-1.5 text-sm font-semibold text-brand">
          <ShieldIcon className="h-4 w-4" /> Product verification
        </span>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-brand-dark sm:text-4xl">
          Verify a product
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-[15px] text-muted">
          Enter the Batch ID from your package to reveal its complete,
          tamper resistant journey. No account needed.
        </p>
      </div>

      <Card className="mx-auto mt-8 max-w-3xl p-5 sm:p-6">
        <VerifyLookup basePath="/verify" />
      </Card>

      <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-3">
        {points.map((p) => (
          <Card key={p.title} className="p-5">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-dark text-white">
              <p.icon className="h-5 w-5" />
            </span>
            <p className="mt-3 font-semibold text-brand-dark">{p.title}</p>
            <p className="mt-1 text-sm text-muted">{p.text}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

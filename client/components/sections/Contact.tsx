import { MailIcon, PhoneIcon, PinIcon, ArrowRightIcon } from "@/components/icons";

const details = [
  {
    icon: <MailIcon className="h-5 w-5" />,
    label: "Email",
    value: "hello@cafsdrychain.io",
  },
  {
    icon: <PhoneIcon className="h-5 w-5" />,
    label: "Phone",
    value: "+234 800 000 0000",
  },
  {
    icon: <PinIcon className="h-5 w-5" />,
    label: "Location",
    value: "Ibadan, Nigeria",
  },
];

export default function Contact() {
  return (
    <section id="contact" className="bg-white py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-12 rounded-[2.5rem] border border-black/[0.06] bg-mint/50 p-8 sm:p-12 lg:grid-cols-2 lg:gap-16">
          {/* Left: copy + details */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-brand shadow-sm">
              Contact
            </span>
            <h2 className="mt-5 text-4xl font-semibold tracking-tight text-brand-dark sm:text-5xl">
              Let&apos;s bring traceability to your produce
            </h2>
            <p className="mt-4 text-lg text-muted">
              Running a solar dryer or sourcing dried produce? Reach out and
              we&apos;ll help you get every batch verified and on-chain.
            </p>

            <ul className="mt-8 space-y-4">
              {details.map((item) => (
                <li key={item.label} className="flex items-center gap-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-dark text-white">
                    {item.icon}
                  </span>
                  <span className="flex flex-col">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
                      {item.label}
                    </span>
                    <span className="text-base font-medium text-brand-dark">
                      {item.value}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right: form */}
          <form className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_-30px_rgba(14,58,23,0.5)] sm:p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" id="name" placeholder="Ada Obi" />
              <Field
                label="Email"
                id="email"
                type="email"
                placeholder="you@company.com"
              />
            </div>
            <div className="mt-4">
              <Field
                label="Organization"
                id="org"
                placeholder="Farm, co-op or company"
              />
            </div>
            <div className="mt-4">
              <label
                htmlFor="message"
                className="mb-1.5 block text-sm font-medium text-brand-dark"
              >
                Message
              </label>
              <textarea
                id="message"
                rows={4}
                placeholder="Tell us about your produce and drying operation…"
                className="w-full resize-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-base text-brand-dark outline-none transition placeholder:text-muted/60 focus:border-brand"
              />
            </div>
            <button
              type="submit"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              Send message <ArrowRightIcon className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  id,
  type = "text",
  placeholder,
}: {
  label: string;
  id: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-brand-dark"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-base text-brand-dark outline-none transition placeholder:text-muted/60 focus:border-brand"
      />
    </div>
  );
}

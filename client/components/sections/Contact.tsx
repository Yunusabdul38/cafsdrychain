"use client";

import { useState } from "react";
import { MailIcon, PhoneIcon, PinIcon, ArrowRightIcon, CheckIcon } from "@/components/icons";
import { useSendContactMessage } from "@/lib/hooks/useContact";
import { ApiError } from "@/lib/api";

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
              we&apos;ll help you get every batch verified and on chain.
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
          <ContactForm />
        </div>
      </div>
    </section>
  );
}

function ContactForm() {
  const send = useSendContactMessage();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const value = (k: string) => String(fd.get(k) ?? "").trim();

    try {
      await send.mutateAsync({
        name: value("name"),
        email: value("email"),
        organization: value("org") || undefined,
        message: value("message"),
      });
      setSent(true);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not send your message. Please email us directly."
      );
    }
  };

  if (sent) {
    return (
      <div className="rounded-3xl bg-white p-8 text-center shadow-[0_20px_60px_-30px_rgba(14,58,23,0.5)] sm:p-10">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-mint text-brand">
          <CheckIcon className="h-7 w-7" />
        </span>
        <h3 className="mt-4 text-xl font-semibold text-brand-dark">
          Message sent
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Thanks for reaching out. We will reply to you by email.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_-30px_rgba(14,58,23,0.5)] sm:p-8"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" id="name" placeholder="Adebayo Ogunlesi" required />
        <Field
          label="Email"
          id="email"
          type="email"
          placeholder="you@company.com"
          required
        />
      </div>
      <div className="mt-4">
        <Field label="Organization" id="org" placeholder="Ìlú Farms Cooperative" />
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
          name="message"
          rows={4}
          required
          minLength={10}
          placeholder="Tell us about your produce and drying operation…"
          className="w-full resize-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-base text-brand-dark outline-none transition placeholder:text-muted/60 focus:border-brand"
        />
      </div>

      {error && (
        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={send.isPending}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
      >
        {send.isPending ? "Sending…" : "Send message"}
        {!send.isPending && <ArrowRightIcon className="h-5 w-5" />}
      </button>
    </form>
  );
}

function Field({
  label,
  id,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  id: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
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
        name={id}
        type={type}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-base text-brand-dark outline-none transition placeholder:text-muted/60 focus:border-brand"
      />
    </div>
  );
}

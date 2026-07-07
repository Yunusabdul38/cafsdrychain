"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { CloseIcon, MenuIcon } from "@/components/icons";

const links = [
  { label: "Home", href: "#home" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6">
      <nav
        className={`mx-auto flex max-w-6xl items-center justify-between rounded-full border border-white/70 bg-white px-4 py-2.5 pl-5 backdrop-blur-md transition-shadow duration-300 sm:px-3 sm:pl-6 shadow-lg`}
      >
        {/* Logo */}
        <a href="#home" className="flex items-center gap-2.5">
          <Image
            src="/img/drychain-logo.png"
            alt="CAFS DryChain logo"
            width={40}
            height={40}
            className="h-9 w-9 rounded-full object-cover"
            priority
          />
          <span className="flex flex-col leading-none">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">
              CAFS
            </span>
            <span className="-mt-0.5 text-lg font-semibold text-brand-dark">
              DryChain
            </span>
          </span>
        </a>

        {/* Desktop links */}
        <ul className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-sm font-medium text-brand-dark/80 transition-colors hover:text-brand"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Desktop actions */}
        <div className="hidden items-center gap-2 md:flex">
          <a
            href="#verify"
            className="rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover"
          >
            Verify a Batch
          </a>
          <a
            href="#login"
            className="rounded-full bg-brand-dark px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-darker"
          >
            Login
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-dark text-white md:hidden"
        >
          {open ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="mx-auto mt-2 max-w-6xl rounded-3xl border border-white/70 bg-white/95 p-4 shadow-xl backdrop-blur-md md:hidden">
          <ul className="flex flex-col">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-2xl px-4 py-3 text-base font-medium text-brand-dark transition-colors hover:bg-mint"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <a
              href="#verify"
              onClick={() => setOpen(false)}
              className="rounded-full bg-brand px-6 py-3 text-center text-sm font-semibold text-white"
            >
              Verify
            </a>
            <a
              href="#login"
              onClick={() => setOpen(false)}
              className="rounded-full bg-brand-dark px-6 py-3 text-center text-sm font-semibold text-white"
            >
              Login
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
